"use client";

export interface BleScaleReading {
  weightKg: number;
  impedanceOhm?: number;
  deviceName?: string;
}

interface GattServerLike {
  getPrimaryService: (uuid: number | string) => Promise<GattServiceLike>;
  getPrimaryServices?: () => Promise<GattServiceLike[]>;
  disconnect?: () => void;
}

interface GattCharacteristicLike {
  properties?: { notify?: boolean; indicate?: boolean; read?: boolean };
  startNotifications: () => Promise<GattCharacteristicLike>;
  addEventListener: (
    ev: string,
    fn: (e: { target: { value: DataView } }) => void
  ) => void;
  readValue?: () => Promise<DataView>;
}

interface GattServiceLike {
  uuid: string;
  getCharacteristic: (uuid: number | string) => Promise<GattCharacteristicLike>;
  getCharacteristics: () => Promise<GattCharacteristicLike[]>;
}

interface BluetoothDeviceLike {
  name?: string;
  gatt?: {
    connect: () => Promise<GattServerLike>;
    connected?: boolean;
  };
}

export function canUseWebBluetooth(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const nav = navigator as unknown as { bluetooth?: { requestDevice?: unknown } };
  return Boolean(nav.bluetooth && typeof nav.bluetooth.requestDevice === "function");
}

function parseWeightMeasurement2A9D(dv: DataView): number | null {
  if (dv.byteLength < 3) return null;
  const flags = dv.getUint8(0);
  const isImperial = (flags & 0x01) === 1;
  const raw = dv.getUint16(1, true);
  const kg = isImperial ? raw * 0.01 * 0.45359237 : raw * 0.005;
  const rounded = Math.round(kg * 10) / 10;
  return rounded >= 35 && rounded <= 220 ? rounded : null;
}

function parseChipseaOkokPacket(dv: DataView): { weightKg: number; impedanceOhm?: number } | null {
  const bytes = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
  if (bytes.length < 4) return null;

  // Common Chipsea / OKOK frame: 0xCA / 0x02 header or 16-bit big-endian at bytes 4..5 or 2..3
  const candidates: number[] = [];
  if (bytes.length >= 6) {
    candidates.push(((bytes[4] << 8) | bytes[5]) / 100);
    candidates.push(((bytes[4] << 8) | bytes[5]) / 10);
  }
  candidates.push(((bytes[2] << 8) | bytes[3]) / 100);
  candidates.push(((bytes[1] << 8) | bytes[2]) / 100);
  candidates.push(dv.getUint16(1, true) / 100);

  for (const val of candidates) {
    const kg = Math.round(val * 10) / 10;
    if (kg >= 45 && kg <= 190) {
      let impedanceOhm: number | undefined;
      if (bytes.length >= 9) {
        const imp = (bytes[6] << 8) | bytes[7];
        if (imp >= 200 && imp <= 1200) impedanceOhm = imp;
      }
      return { weightKg: kg, impedanceOhm };
    }
  }
  return null;
}

export async function readBleScaleWeight(timeoutMs = 18000): Promise<BleScaleReading> {
  if (!canUseWebBluetooth()) {
    throw new Error("Web Bluetooth is unavailable here. Use Chrome on Android (HTTPS/localhost).");
  }

  const nav = navigator as unknown as {
    bluetooth: {
      requestDevice: (opts: unknown) => Promise<BluetoothDeviceLike>;
    };
  };

  const device = await nav.bluetooth.requestDevice({
    filters: [
      { services: [0x181d] },
      { services: [0x181b] },
      { services: [0xfff0] },
      { services: [0xffb0] },
      { namePrefix: "OKOK" },
      { namePrefix: "Chipsea" },
      { namePrefix: "CS" },
      { namePrefix: "Scale" },
      { namePrefix: "Health" },
    ],
    optionalServices: [0x181d, 0x181b, 0xfff0, 0xffb0],
  });

  if (!device.gatt) {
    throw new Error("Selected scale does not expose BLE GATT.");
  }

  const server = await device.gatt.connect();

  return new Promise<BleScaleReading>(async (resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        server.disconnect?.();
      } catch {
        // ignore
      }
      reject(new Error("Timed out waiting for stabilized scale reading. Step on scale first."));
    }, timeoutMs);

    const finish = (reading: BleScaleReading) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        server.disconnect?.();
      } catch {
        // ignore
      }
      resolve(reading);
    };

    try {
      const services = server.getPrimaryServices
        ? await server.getPrimaryServices()
        : [];
      for (const svc of services) {
        const chars = await svc.getCharacteristics().catch(() => []);
        for (const ch of chars) {
          if (ch.properties?.notify || ch.properties?.indicate) {
            await ch.startNotifications().catch(() => {});
            ch.addEventListener("characteristicvaluechanged", (ev) => {
              const dv = ev.target.value;
              const stdKg = parseWeightMeasurement2A9D(dv);
              if (stdKg !== null) {
                finish({ weightKg: stdKg, deviceName: device.name });
                return;
              }
              const cs = parseChipseaOkokPacket(dv);
              if (cs) {
                finish({
                  weightKg: cs.weightKg,
                  impedanceOhm: cs.impedanceOhm,
                  deviceName: device.name,
                });
              }
            });
          }
        }
      }
      if (services.length === 0) {
        for (const uuid of [0x181d, 0xfff0, 0xffb0, 0x181b]) {
          try {
            const svc = await server.getPrimaryService(uuid);
            const chars = await svc.getCharacteristics();
            for (const ch of chars) {
              await ch.startNotifications().catch(() => {});
              ch.addEventListener("characteristicvaluechanged", (ev) => {
                const dv = ev.target.value;
                const stdKg = parseWeightMeasurement2A9D(dv);
                if (stdKg !== null) {
                  finish({ weightKg: stdKg, deviceName: device.name });
                  return;
                }
                const cs = parseChipseaOkokPacket(dv);
                if (cs) {
                  finish({
                    weightKg: cs.weightKg,
                    impedanceOhm: cs.impedanceOhm,
                    deviceName: device.name,
                  });
                }
              });
            }
          } catch {
            // service absent on this scale
          }
        }
      }
    } catch (err) {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error("Failed reading BLE scale."));
      }
    }
  });
}
