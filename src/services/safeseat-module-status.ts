import type {
  SafeSeatHardwareStatus,
  SafeSeatModuleState,
  SafeSeatModuleSummary,
} from "@/types/safeseat-hardware";

function summary(
  id: string,
  label: string,
  state: SafeSeatModuleState,
  detail: string,
  action?: string,
): SafeSeatModuleSummary {
  return { id, label, state, detail, action };
}

export function deriveSafeSeatModuleStatuses(
  telemetry: SafeSeatHardwareStatus | null,
  hubReachable = false,
): SafeSeatModuleSummary[] {
  if (!telemetry) {
    const state = hubReachable ? "degraded" : "not_detected";
    const detail = hubReachable
      ? "Main Hub reachable; module telemetry is not ready."
      : "No live telemetry from Main Hub.";

    return [
      summary("M1", "Headrest", state, detail, "Check C1001/MLX status and Main Hub telemetry."),
      summary("M2", "Backrest", state, detail, "Check FSR/ADS1115 connections."),
      summary("M3", "Cushion", state, detail, "Check cushion FSR wiring and calibration."),
      summary("M4", "Seat Frame", state, detail, "Check MPU6050/I2C connection."),
      summary("CAM", "Camera", state, detail, "Check ESP32-S3 camera power/link."),
    ];
  }

  const { c1001, mlx90614, fsr, mpu6050 } = telemetry.sensors;
  const camera = telemetry.camera;

  const headrestOperational =
    c1001.connected && !c1001.stale && mlx90614.connected && mlx90614.valid;
  const headrestDetected = c1001.connected || mlx90614.connected;

  const fsrOperational = fsr.connected && fsr.calibrated;
  const mpuOperational = mpu6050.connected && mpu6050.valid;
  const cameraOperational =
    camera.connected &&
    !camera.stale &&
    camera.camera_ready &&
    camera.model_ready &&
    camera.psram_ready;
  const cameraDetected = camera.connected || camera.transport_connected;

  return [
    summary(
      "M1",
      "Headrest",
      headrestOperational ? "operational" : headrestDetected ? "degraded" : "not_detected",
      `C1001 ${c1001.connected && !c1001.stale ? "linked" : c1001.stale ? "stale" : "offline"} • MLX ${mlx90614.connected && mlx90614.valid ? "valid" : mlx90614.connected ? "degraded" : "offline"}`,
      headrestOperational
        ? undefined
        : "Check C1001 node/ESP-NOW and the MLX90614 headrest connection.",
    ),
    summary(
      "M2",
      "Backrest",
      fsrOperational ? "operational" : fsr.connected ? "degraded" : "not_detected",
      fsrOperational
        ? "Backrest pressure sensing is calibrated and ready."
        : fsr.connected
          ? "Backrest pressure sensing is detected but calibration is not ready."
          : "Backrest pressure sensing is not detected.",
      fsrOperational ? undefined : "Check ADS1115/FSR wiring and re-run calibration.",
    ),
    summary(
      "M3",
      "Cushion",
      fsrOperational ? "operational" : fsr.connected ? "degraded" : "not_detected",
      fsrOperational
        ? "Cushion pressure sensing is calibrated and ready."
        : fsr.connected
          ? "Cushion pressure sensing is detected but calibration is not ready."
          : "Cushion pressure sensing is not detected.",
      fsrOperational ? undefined : "Check cushion FSR wiring and re-run calibration.",
    ),
    summary(
      "M4",
      "Seat Frame",
      mpuOperational ? "operational" : mpu6050.connected ? "degraded" : "not_detected",
      mpuOperational
        ? "Seat-frame motion sensing is connected and ready."
        : mpu6050.connected
          ? "Seat-frame motion sensing is detected but the current signal is degraded."
          : "Seat-frame motion sensing is not detected.",
      mpuOperational ? undefined : "Check the M4 seat-frame I2C/clip connection.",
    ),
    summary(
      "CAM",
      "Camera",
      cameraOperational ? "operational" : cameraDetected ? "degraded" : "not_detected",
      cameraOperational
        ? camera.verification_requested
          ? "Posture verification is currently active."
          : "Trigger-only posture verification is ready."
        : cameraDetected
          ? "Camera link is detected but the verification module is not fully ready."
          : "Camera verification module is not detected.",
      cameraOperational ? undefined : "Check ESP32-S3 camera power, readiness, and wireless link.",
    ),
  ];
}
