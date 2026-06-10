import path from 'node:path';

export function createFileEventHandler({ builder, reload, logger = console }) {
  let updateQueue = Promise.resolve();

  return function handleFileEvent(eventName, filePath) {
    updateQueue = updateQueue
      .then(async () => {
        await builder.handleFileEvent(eventName, filePath);
        reload();
        logger.log(`${eventName}: ${path.relative(builder.sourceDirectory, filePath)}`);
      })
      .catch((error) => logger.error('Aggiornamento fallito:', error));

    return updateQueue;
  };
}
