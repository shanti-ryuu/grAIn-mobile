import AsyncStorage from "@react-native-async-storage/async-storage";

export const COMMAND_QUEUE_KEY = "grain_command_queue";

export interface QueuedCommand {
  id: string;
  deviceId: string;
  commandType: string;
  payload: Record<string, unknown>;
  queuedAt: string;
}

type QueueListener = (count: number) => void;

const listeners = new Set<QueueListener>();

async function readQueue(): Promise<QueuedCommand[]> {
  const raw = await AsyncStorage.getItem(COMMAND_QUEUE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as QueuedCommand[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(commands: QueuedCommand[]): Promise<void> {
  await AsyncStorage.setItem(COMMAND_QUEUE_KEY, JSON.stringify(commands));
  notifyQueueListeners(commands.length);
}

export function subscribeQueueCount(listener: QueueListener): () => void {
  listeners.add(listener);
  void getQueueCount().then(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyQueueListeners(count: number): void {
  listeners.forEach((listener) => listener(count));
}

export async function enqueueCommand(command: QueuedCommand): Promise<void> {
  const commands = await readQueue();
  commands.push(command);
  await writeQueue(commands);
}

export async function dequeueAll(): Promise<QueuedCommand[]> {
  const commands = await readQueue();
  await writeQueue([]);
  return commands;
}

export async function getQueueCount(): Promise<number> {
  return (await readQueue()).length;
}

export async function flushQueue(
  executor: (command: QueuedCommand) => Promise<void>,
): Promise<void> {
  const commands = await readQueue();
  const remaining = [...commands];

  while (remaining.length > 0) {
    const command = remaining[0];
    try {
      await executor(command);
      remaining.shift();
      await writeQueue(remaining);
    } catch {
      await writeQueue(remaining);
      break;
    }
  }
}
