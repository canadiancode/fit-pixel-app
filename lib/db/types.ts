/** Every writable local row carries a stable id + createdAt for later server POST. */
export type LocalRecord = {
  id: string;
  createdAt: string;
};
