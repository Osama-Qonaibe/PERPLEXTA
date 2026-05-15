import { useAppContext } from '../context/AppContext';

export const useSocket = () => {
  const { socket } = useAppContext();
  return { socket };
};
