const lucide = require('lucide-react');
const icons = [
  'User', 'Users', 'Settings2', 'Shield', 'CreditCard', 'Wallet', 'Palette', 'Keyboard', 'BrainCircuit', 'Globe', 'ChevronRight', 'ChevronLeft', 'LogOut', 'Link2', 'Trash2', 'Edit2', 'Save', 'X', 'Plus', 'Loader2', 'Command', 'Terminal', 'MousePointer2', 'Type', 'MessageSquare', 'Image', 'Video', 'LayoutGrid', 'Activity', 'Clock', 'Zap', 'ShieldCheck', 'Brain', 'MapPin', 'FileText', 'Mic', 'Volume2', 'Code', 'ShoppingBag', 'ChevronDown', 'Newspaper', 'Info', 'Target', 'Building2', 'ExternalLink', 'Layers', 'Cpu', 'Search', 'Lock', 'CheckCircle2', 'Scale', 'BookOpen', 'Music', 'Megaphone', 'Boxes', 'Gift', 'Calendar', 'Eye', 'ArrowLeft', 'Sparkles', 'Twitter', 'Linkedin', 'Send', 'AlertCircle', 'Edit', 'Monitor', 'Upload'
];
const missing = icons.filter(icon => !lucide[icon]);
console.log('Missing:', missing);
