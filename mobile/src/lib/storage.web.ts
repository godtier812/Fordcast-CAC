export const storage = {
  get: async (key: string) =>
    typeof localStorage === 'undefined' ? null : localStorage.getItem(key),
  set: async (key: string, value: string) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
};
