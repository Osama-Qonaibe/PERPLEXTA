export const useConfirm = () => {
  return (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      resolve(window.confirm(message));
    });
  };
};
