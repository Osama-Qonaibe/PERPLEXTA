import { useUI } from '../context/UIContext';

export const useInteractions = () => {
  const ui = useUI();

  const toggleSidebar = () => {
    ui.setIsSidebarOpen(!ui.isSidebarOpen);
  };

  const closeSidebar = () => {
    ui.setIsSidebarOpen(false);
  };

  const openSidebar = () => {
    ui.setIsSidebarOpen(true);
  };

  return {
    ...ui,
    toggleSidebar,
    closeSidebar,
    openSidebar,
  };
};
