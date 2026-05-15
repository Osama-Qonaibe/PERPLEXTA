import { useAppContext } from '../context/AppContext';

export const useAuth = () => {
  const {
    user, setUser, token, isAuthReady,
    login, signup, logout, loginWithGoogle,
    refreshUser, balance, balanceUSD,
    isAuthModalOpen, setIsAuthModalOpen,
    rememberMe, setRememberMe,
    payWithBalance, stripeCheckout,
  } = useAppContext();

  return {
    user, setUser, token, isAuthReady,
    login, signup, logout, loginWithGoogle,
    refreshUser, balance, balanceUSD,
    isAuthModalOpen, setIsAuthModalOpen,
    rememberMe, setRememberMe,
    payWithBalance, stripeCheckout,
  };
};
