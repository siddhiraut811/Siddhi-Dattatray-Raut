/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

let model: cocoSsd.ObjectDetection | null = null;

export const loadModel = async () => {
  if (model) return model;
  model = await cocoSsd.load({
    base: 'lite_mobilenet_v2' // Faster for real-time browser use
  });
  return model;
};

export const detectVehicles = async (videoElement: HTMLVideoElement) => {
  if (!model) return [];
  
  const predictions = await model.detect(videoElement);
  
  // COCO-SSD labels for vehicles
  const vehicleLabels = ['car', 'bus', 'truck', 'motorcycle'];
  
  return predictions.filter(p => 
    vehicleLabels.includes(p.class) && p.score > 0.6
  );
};
