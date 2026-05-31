const { Queue } = require('bullmq');
const { redisConfig } = require('./redis');

/*************************************************
 * CONFIG UNIFICADA — MATCHING QUEUE
 * Esta config debe ser usada por producers y workers
 *************************************************/

const queueOptions = {
  connection: redisConfig,

  defaultJobOptions: {
    attempts: 1, // ❗ Evita ofertas duplicadas
    removeOnComplete: {
      count: 1000,
      age: 3600 // 1 hora
    },
    removeOnFail: {
      count: 500,
      age: 3600
    }
  }
};

const matchingQueue = new Queue('matching-queue', queueOptions);

module.exports = { matchingQueue, queueOptions };