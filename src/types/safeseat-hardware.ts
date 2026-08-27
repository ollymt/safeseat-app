export type SafeSeatFusionState = "SAFE" | "WATCH" | "WARNING" | "EMERGENCY";

export type SafeSeatModelEvidence = {
  available: boolean;
  valid: boolean;
  isolation_forest_anomaly?: boolean;
  one_class_svm_anomaly?: boolean;
  both_models_anomaly?: boolean;
  either_model_anomaly?: boolean;
  isolation_forest_score?: number | null;
  one_class_svm_score?: number | null;
  confidence?: number | null;
};

export type SafeSeatHubHealth = {
  ok: boolean;
  service?: string;
  api_version?: string;
  uptime_ms?: number;
  telemetry_ready: boolean;
  read_only?: boolean;
};

export type SafeSeatHardwareStatus = {
  schema_version: string;
  device: string;
  telemetry_ready: boolean;
  timestamp_ms: number;
  uptime_ms: number;
  system: {
    fusion_authoritative: boolean;
    fusion_valid: boolean;
    fusion_state: SafeSeatFusionState;
    confidence: number | null;
    emergency_active: boolean;
    camera_verification_requested: boolean;
    alert_requested: boolean;
    occupancy: string;
    motion_context: string;
    vitals_state: string;
    pressure_state: string;
    temperature_state: string;
    respiration_state: string;
    evidence: {
      valid_sensor_count: number;
      unavailable_sensor_count: number;
      anomaly_evidence_count: number;
      strong_anomaly_evidence_count: number;
      normal_evidence_count: number;
      supporting_context_count: number;
      motion_artifact_possible: boolean;
      multi_sensor_agreement: boolean;
    };
  };
  network: {
    ap_running: boolean;
    ssid: string;
    ip: string;
    channel: number;
    connected_clients: number;
    local_only: boolean;
    internet_required: boolean;
    esp_now_enabled: boolean;
  };
  sensors: {
    c1001: {
      health: string;
      connected: boolean;
      stale: boolean;
      packet_age_ms: number;
      packets_received: number;
      present: boolean;
      status: string;
      trusted_vitals: boolean;
      heart_rate_bpm: number | null;
      respiration_rate_bpm: number | null;
      motion: number;
      move_range: number;
      motion_artifact_active: boolean;
      model: SafeSeatModelEvidence;
    };
    mlx90614: {
      health: string;
      connected: boolean;
      valid: boolean;
      object_temperature_c: number | null;
      sensor_ta_c: number | null;
      object_minus_ta_c: number | null;
      context: {
        available: boolean;
        thermal_target_qualified: boolean;
        target_contrast_degraded: boolean;
        low_contrast_samples: number;
        target_losses: number;
        baseline_ready: boolean;
        context_change: boolean;
        baseline_object_c: number | null;
        deviation_from_baseline_c: number | null;
      };
      native_mlx_model: SafeSeatModelEvidence;
      native_mlx_model_fusion_role: string;
    };
    fsr: {
      health: string;
      connected: boolean;
      calibrated: boolean;
      occupied: boolean;
      back_contact: boolean;
      sampling_rate_hz: number | null;
      backrest_total: number | null;
      cushion_total: number | null;
      whole_seat_total: number | null;
      pressure: Array<number | null>;
      pressure_share: Array<number | null>;
      model: SafeSeatModelEvidence;
    };
    mpu6050: {
      health: string;
      connected: boolean;
      valid: boolean;
      sampling_rate_hz: number | null;
      accel_magnitude_g: number | null;
      gyro_magnitude_dps: number | null;
      dynamic_acceleration_g: number | null;
      road_motion_model: SafeSeatModelEvidence;
      model_interpretation: string;
      fusion_role: string;
    };
  };
  camera: {
    available: boolean;
    connected: boolean;
    transport_connected: boolean;
    stale: boolean;
    camera_ready: boolean;
    model_ready: boolean;
    psram_ready: boolean;
    busy: boolean;
    packet_age_ms: number;
    status_packets_received: number;
    result_packets_received: number;
    verification_requested: boolean;
    request_active: boolean;
    active_request_id: number;
    result_valid: boolean;
    result_request_id: number;
    posture: string;
    posture_normal: boolean;
    posture_abnormal: boolean;
    confidence: number | null;
    verification_only: boolean;
  };
};

export type SafeSeatHardwareConnectionState =
  | "idle"
  | "connecting"
  | "online"
  | "degraded"
  | "offline";

export type SafeSeatModuleState = "operational" | "degraded" | "not_detected";

export type SafeSeatModuleSummary = {
  id: string;
  label: string;
  state: SafeSeatModuleState;
  detail: string;
  action?: string;
};
