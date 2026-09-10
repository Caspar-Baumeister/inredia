import { Home, Images, Settings, SlidersHorizontal } from "lucide-react";

// Shared by the desktop sidebar and the mobile drawer.
export const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/library", label: "Library", icon: Images },
  { href: "/preferences", label: "Preferences", icon: SlidersHorizontal },
  { href: "/settings", label: "Settings", icon: Settings },
];
