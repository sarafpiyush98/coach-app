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
  uuid?: string;
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
  return rounded >= 40 && rounded <= 220 ? rounded : null;
}

function parseChipseaOkokPacket(
  dv: DataView
): { weightKg: number; impedanceOhm?: number; explicitStable?: boolean } | null {
  const bytes = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
  if (bytes.length < 4) return null;

  const header = bytes[0];
  const candidates: number[] = [];
  let explicitStable = false;

  // Known Chipsea / OKOK headers (0xCA, 0xAC, 0x10, 0x02, 0xCF)
  if ((header === 0xca || header === 0xac || header === 0xcf) && bytes.length >= 6) {
    candidates.push(((bytes[4] << 8) | bytes[5]) / 100);
    candidates.push(((bytes[4] << 8) | bytes[5]) / 10);
    candidates.push(((bytes[2] << 8) | bytes[3]) / 100);
    // Common OKOK lock bit in byte 1 or byte 2
    explicitStable = (bytes[1] & 0x01) === 1 || bytes[1] === 0x02;
  } else if ((header === 0x10 || header === 0x02) && bytes.length >= 5) {
    candidates.push(((bytes[2] << 8) | bytes[3]) / 100);
    candidates.push(((bytes[3] << 8) | bytes[4]) / 100);
    candidates.push(dv.getUint16(1, true) / 100);
  } else {
    if (bytes.length >= 6) {
      candidates.push(((bytes[4] << 8) | bytes[5]) / 100);
    }
    candidates.push(((bytes[2] << 8) | bytes[3]) / 100);
    candidates.push(dv.getUint16(1, true) / 100);
  }

  for (const val of candidates) {
    const kg = Math.round(val * 10) / 10;
    if (kg >= 45 && kg <= 190) {
      let impedanceOhm: number | undefined;
      if (bytes.length >= 9) {
        const imp = (bytes[6] << 8) | bytes[7];
        if (imp >= 200 && imp <= 1200) impedanceOhm = imp;
      }
      return { weightKg: kg, impedanceOhm, explicitStable };
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
    let settleFallbackTimer: ReturnType<typeof setTimeout> | null = null;
    const recentReadings: Array<{ weightKg: number; impedanceOhm?: number; tsMs: number }> = [];

    const cleanup = () => {
      if (settleFallbackTimer) {
        clearTimeout(settleFallbackTimer);
        settleFallbackTimer = null;
      }
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        server.disconnect?.();
      } catch {
        // ignore
      }
      reject(new Error("Timed out waiting for stabilized scale reading. Stay still on scale."));
    }, timeoutMs);

    const finish = (reading: BleScaleReading) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      try {
        server.disconnect?.();
      } catch {
        // ignore
      }
      resolve(reading);
    };

    const pushCandidate = (
      weightKg: number,
      impedanceOhm: number | undefined,
      isStandard2A9D: boolean,
      isIndicateOnly: boolean
    ) => {
      if (settled) return;
      const now = Date.now();
      recentReadings.push({ weightKg, impedanceOhm, tsMs: now });
      while (recentReadings.length > 6) {
        recentReadings.shift();
      }

      // Standard 0x2A9D indicate-only scales emit a single stabilized frame
      if (isStandard2A9D && isIndicateOnly) {
        if (settleFallbackTimer) clearTimeout(settleFallbackTimer);
        settleFallbackTimer = setTimeout(() => {
          finish({ weightKg, impedanceOhm, deviceName: device.name });
        }, 1200);
      }

      // Require 3 consecutive agreeing readings within +/-0.1 kg over >=900ms
      if (recentReadings.length >= 3) {
        const tail = recentReadings.slice(-3);
        const weights = tail.map((r) => r.weightKg);
        const spread = Math.max(...weights) - Math.min(...weights);
        const spanMs = tail[2].tsMs - tail[0].tsMs;
        if (spread <= 0.11 && spanMs >= 900) {
          const avg = Math.round(((weights[0] + weights[1] + weights[2]) / 3) * 10) / 10;
          const imp = tail[2].impedanceOhm ?? tail[1].impedanceOhm ?? tail[0].impedanceOhm;
          finish({
            weightKg: avg,
            impedanceOhm: imp,
            deviceName: device.name,
          });
        }
      }
    };

    const attachCharacteristic = async (ch: GattCharacteristicLike) => {
      if (!(ch.properties?.notify || ch.properties?.indicate)) return;
      await ch.startNotifications().catch(() => {});
      const uuid = (ch.uuid || "").toLowerCase();
      const isStd2A9D = uuid.includes("2a9d");
      const isIndicateOnly = Boolean(ch.properties?.indicate && !ch.properties?.notify);

      ch.addEventListener("characteristicvaluechanged", (ev) => {
        const dv = ev.target.value;
        if (isStd2A9D) {
          const stdKg = parseWeightMeasurement2A9D(dv);
          if (stdKg !== null) {
            pushCandidate(stdKg, undefined, true, isIndicateOnly);
          }
          return;
        }
        const cs = parseChipseaOkokPacket(dv);
        if (cs) {
          pushCandidate(cs.weightKg, cs.impedanceOhm, false, false);
        }
      });
    };

    try {
      const services = server.getPrimaryServices
        ? await server.getPrimaryServices()
        : [];
      for (const svc of services) {
        const chars = await svc.getCharacteristics().catch(() => []);
        for (const ch of chars) {
          await attachCharacteristic(ch);
        }
      }
      if (services.length === 0) {
        for (const uuid of [0x181d, 0xfff0, 0xffb0, 0x181b]) {
          try {
            const svc = await server.getPrimaryService(uuid);
            const chars = await svc.getCharacteristics();
            for (const ch of chars) {
              await attachCharacteristic(ch);
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
        cleanup();
        reject(err instanceof Error ? err : new Error("Failed reading BLE scale."));
      }
    }
  });
}
