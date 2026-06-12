import { Server } from 'socket.io';
import { getPrismaClient } from '../config/prisma-client.js';
import logger from '../config/logger.js';

let io = null;

export function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    logger.info(`WebSocket Client Connected: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.info(`WebSocket Client Disconnected: ${socket.id}`);
    });
  });

  startTelemetrySimulator();
}

function startTelemetrySimulator() {
  logger.info('Starting asset telemetry simulator loop...');
  setInterval(async () => {
    try {
      const prisma = getPrismaClient();
      const assets = await prisma.asset.findMany({
        where: { status: 'Active' }
      });

      for (const asset of assets) {
        // Telemetry update: slight movement simulation
        const headingRad = (asset.heading * Math.PI) / 180;
        const speedFactor = asset.speed / 360000; // scaling to make it realistic on map
        
        const deltaLat = Math.cos(headingRad) * speedFactor * (0.8 + Math.random() * 0.4);
        const deltaLng = Math.sin(headingRad) * speedFactor * (0.8 + Math.random() * 0.4);

        // Adjust heading slightly (drift)
        const headingDrift = (Math.random() - 0.5) * 10;
        let newHeading = (asset.heading + headingDrift) % 360;
        if (newHeading < 0) newHeading += 360;

        // Drain fuel slowly
        const fuelConsumption = 0.02 + Math.random() * 0.03;
        const newFuel = Math.max(0, asset.fuel - fuelConsumption);

        const updatedAsset = await prisma.asset.update({
          where: { id: asset.id },
          data: {
            lat: asset.lat + deltaLat,
            lng: asset.lng + deltaLng,
            heading: parseFloat(newHeading.toFixed(1)),
            fuel: parseFloat(newFuel.toFixed(1))
          }
        });

        if (io) {
          io.emit('telemetry:update', updatedAsset);
        }
      }
    } catch (error) {
      logger.error('Error in telemetry simulation step', { error: error.message });
    }
  }, 3000);
}
