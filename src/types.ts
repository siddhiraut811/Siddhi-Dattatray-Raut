/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Detection {
  id: string;
  timestamp: number;
  label: string;
  confidence: number;
}

export interface Alert {
  id: string;
  timestamp: number;
  type: 'vehicle_detected' | 'system_alert' | 'help_request';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface HelpCenter {
  id: string;
  name: string;
  distance: string;
  status: 'active' | 'busy' | 'offline';
  location: {
    x: number; // 0-100%
    y: number; // 0-100%
  };
}
