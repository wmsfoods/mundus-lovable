// Mundus Trade — Inline SVG icons (outline / Feather-like)
// Ported verbatim from the design system's icons.jsx
//
// All icons use a 24x24 viewBox with currentColor stroke by default,
// so you can color them via CSS (e.g. text-p800, text-g500).

import { SVGProps, ReactNode } from "react";

// ============================================================================
// Base Icon wrapper
// ============================================================================
type IconBaseProps = Omit<SVGProps<SVGSVGElement>, "stroke" | "fill"> & {
  children: ReactNode;
  size?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
};

export function Icon({
  children,
  size = 20,
  stroke = "currentColor",
  strokeWidth = 2,
  fill = "none",
  style,
  ...rest
}: IconBaseProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

type IconProps = Omit<IconBaseProps, "children">;

// ============================================================================
// Generic icons
// ============================================================================
export const UserIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
  </Icon>
);
export const EyeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);
export const EyeOffIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M2 2l20 20" />
    <path d="M6.7 6.7C4 8.5 2 12 2 12s3.5 7 10 7c2 0 3.7-.5 5.2-1.3" />
    <path d="M9.9 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7-.7 1.2-1.6 2.3-2.6 3.2" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </Icon>
);
export const GlobeIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2c2.5 3 4 6.7 4 10s-1.5 7-4 10c-2.5-3-4-6.7-4-10S9.5 5 12 2z" />
  </Icon>
);

// ============================================================================
// Chevrons & Arrows
// ============================================================================
export const ChevronDownIcon = (props: IconProps) => (
  <Icon {...props}>
    <polyline points="6 9 12 15 18 9" />
  </Icon>
);
export const ChevronLeftIcon = (props: IconProps) => (
  <Icon {...props}>
    <polyline points="15 18 9 12 15 6" />
  </Icon>
);
export const ChevronRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <polyline points="9 18 15 12 9 6" />
  </Icon>
);
export const ArrowRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </Icon>
);
export const ArrowLeftIcon = (props: IconProps) => (
  <Icon {...props}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </Icon>
);
export const ArrowTopRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </Icon>
);
export const ArrowsLeftRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M7 7l-4 4 4 4" />
    <path d="M3 11h16" />
    <path d="M17 17l4-4-4-4" />
    <path d="M21 13H5" />
  </Icon>
);

// ============================================================================
// Checks & Status
// ============================================================================
export const CheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <polyline points="20 6 9 17 4 12" />
  </Icon>
);
export const CheckCircleIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="8 12.5 11 15.5 16 9.5" />
  </Icon>
);
export const AlertIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </Icon>
);

// ============================================================================
// Files / IO
// ============================================================================
export const UploadIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </Icon>
);
export const UploadCloudIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M16 16l-4-4-4 4" />
    <path d="M12 12v9" />
    <path d="M20.4 17.6A5 5 0 0 0 17 9h-1.3A8 8 0 1 0 4 16.2" />
    <path d="M16 16l-4-4-4 4" />
  </Icon>
);
export const DownloadIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </Icon>
);
export const FileIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </Icon>
);
export const FileTextIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="13" y2="17" />
  </Icon>
);

// ============================================================================
// Misc UI
// ============================================================================
export const XIcon = (props: IconProps) => (
  <Icon {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </Icon>
);
export const CloseIcon = XIcon;
export const PlusIcon = (props: IconProps) => (
  <Icon {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </Icon>
);
export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.6" y2="16.6" />
  </Icon>
);
export const FilterIcon = (props: IconProps) => (
  <Icon {...props} fill="currentColor">
    <path d="M22 3H2l8 9.5V21l4-2v-6.5L22 3z" />
  </Icon>
);
export const EditIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </Icon>
);
export const MoreVerticalIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none" />
  </Icon>
);
export const BellIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </Icon>
);
export const LockIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Icon>
);
export const SortIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M7 3v18" />
    <polyline points="3 7 7 3 11 7" />
    <path d="M17 21V3" />
    <polyline points="13 17 17 21 21 17" />
  </Icon>
);
export const GridIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </Icon>
);
export const ListIcon = (props: IconProps) => (
  <Icon {...props}>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
  </Icon>
);
export const CameraIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </Icon>
);
export const SparkleIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 2v6" />
    <path d="M12 16v6" />
    <path d="M2 12h6" />
    <path d="M16 12h6" />
    <path d="M5 5l3.5 3.5" />
    <path d="M15.5 15.5L19 19" />
    <path d="M5 19l3.5-3.5" />
    <path d="M15.5 8.5L19 5" />
  </Icon>
);

// ============================================================================
// Domain icons (navigation, deal context)
// ============================================================================
export const HomeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 11l9-8 9 8" />
    <path d="M5 10v10a1 1 0 0 0 1 1h4v-7h4v7h4a1 1 0 0 0 1-1V10" />
  </Icon>
);
export const UsersIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Icon>
);
export const ClipboardIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  </Icon>
);
export const TagIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20.6 13.4 13 21a2 2 0 0 1-2.8 0L3 13.8V3h10.8L21 10.2a2 2 0 0 1 0 2.8z" />
    <circle cx="7.5" cy="7.5" r="1.4" fill="currentColor" stroke="none" />
  </Icon>
);
export const MessageIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
  </Icon>
);
export const FlagIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 22V4" />
    <path d="M4 5h12l-2 4 2 4H4" />
  </Icon>
);
export const CartIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="9" cy="20" r="1.5" />
    <circle cx="18" cy="20" r="1.5" />
    <path d="M3 4h2l2.7 11.3a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L21 8H6" />
  </Icon>
);
export const MapPinIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </Icon>
);
export const CalendarIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </Icon>
);
export const DollarIcon = (props: IconProps) => (
  <Icon {...props}>
    <line x1="12" y1="2" x2="12" y2="22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </Icon>
);
export const QuestionIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </Icon>
);
export const KnifeForkIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M7 2v9" />
    <path d="M5 2v6a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V2" />
    <path d="M7 11v11" />
    <path d="M17 2c-2 0-3 2-3 5s1 5 3 5v10" />
  </Icon>
);
export const ShipIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M2 20a3.5 3.5 0 0 1 3.5-3.5h0a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1 3.5-3.5h0A3.5 3.5 0 0 1 16 20a3.5 3.5 0 0 1 3.5-3.5h.5" />
    <path d="M4 16l-1-6h18l-1 6" />
    <path d="M12 4v6" />
    <path d="M9 7h6" />
  </Icon>
);

// ============================================================================
// Chat / communication
// ============================================================================
export const PhoneIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </Icon>
);
export const VideoIcon = (props: IconProps) => (
  <Icon {...props}>
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </Icon>
);
export const SmileIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </Icon>
);
export const ImageIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </Icon>
);
export const PaperclipIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </Icon>
);
export const SendIcon = (props: IconProps) => (
  <Icon {...props}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </Icon>
);
export const MoonIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </Icon>
);

// DoubleCheckIcon has its own signature (size + color, custom viewBox)
type DoubleCheckProps = {
  size?: number;
  color?: string;
};
export const DoubleCheckIcon = ({ size = 16, color = "#3478d4" }: DoubleCheckProps) => (
  <svg
    width={size * 1.2}
    height={size * 0.75}
    viewBox="0 0 18 12"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="1 7 4.5 10.5 11 4" />
    <polyline points="6.5 7 10 10.5 17 3" />
  </svg>
);

// ============================================================================
// Flags
// ============================================================================
type USFlagProps = { width?: number; height?: number };
export const USFlag = ({ width = 22, height = 16 }: USFlagProps) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 22 16"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect width="22" height="16" fill="#bf0a30" />
    <rect y="1.23" width="22" height="1.23" fill="#fff" />
    <rect y="3.69" width="22" height="1.23" fill="#fff" />
    <rect y="6.15" width="22" height="1.23" fill="#fff" />
    <rect y="8.61" width="22" height="1.23" fill="#fff" />
    <rect y="11.07" width="22" height="1.23" fill="#fff" />
    <rect y="13.54" width="22" height="1.23" fill="#fff" />
    <rect width="9" height="7.38" fill="#002868" />
  </svg>
);

// Country flag palettes — 16x12 viewBox
// (Simplified emblems; not pixel-perfect but recognizable at small sizes.)
type FlagPalette = { bg: string; el: ReactNode };
export const flagPalettes: Record<string, FlagPalette> = {
  BR: { bg: "#009b3a", el: (<><polygon points="8,1.5 14.5,6 8,10.5 1.5,6" fill="#fedf00" /><circle cx="8" cy="6" r="2.4" fill="#002776" /></>) },
  CN: { bg: "#de2910", el: (<><circle cx="3" cy="3" r="1.4" fill="#ffde00" /><circle cx="5.5" cy="1.7" r=".5" fill="#ffde00" /><circle cx="6.4" cy="3" r=".5" fill="#ffde00" /><circle cx="6.4" cy="4.5" r=".5" fill="#ffde00" /><circle cx="5.5" cy="5.5" r=".5" fill="#ffde00" /></>) },
  AR: { bg: "#75aadb", el: (<><rect y="4" width="16" height="4" fill="#fff" /><circle cx="8" cy="6" r="1" fill="#f6b40e" /></>) },
  US: { bg: "#bf0a30", el: (<><rect y="1.5" width="16" height="1.5" fill="#fff" /><rect y="4.5" width="16" height="1.5" fill="#fff" /><rect y="7.5" width="16" height="1.5" fill="#fff" /><rect y="10.5" width="16" height="1.5" fill="#fff" /><rect width="7" height="6" fill="#002868" /></>) },
  HK: { bg: "#de2910", el: <circle cx="8" cy="6" r="2" fill="#fff" /> },
  SA: { bg: "#006c35", el: <rect x="3" y="4" width="10" height="4" fill="#fff" opacity=".25" /> },
  AF: { bg: "#000", el: (<><rect x="5.33" width="5.33" height="12" fill="#ce1126" /><rect x="10.66" width="5.34" height="12" fill="#007a36" /></>) },
  PS: { bg: "#000", el: (<><rect y="4" width="16" height="4" fill="#fff" /><rect y="8" width="16" height="4" fill="#007a3d" /><polygon points="0,0 0,12 6,6" fill="#ce1126" /></>) },
  UY: { bg: "#fff", el: (<><rect y="2" width="16" height="1.3" fill="#0038a8" /><rect y="4.6" width="16" height="1.3" fill="#0038a8" /><rect y="7.2" width="16" height="1.3" fill="#0038a8" /><rect y="9.8" width="16" height="1.3" fill="#0038a8" /><rect width="6" height="5.9" fill="#fff" stroke="#0038a8" strokeWidth=".4" /><circle cx="3" cy="3" r="1.4" fill="#fcd116" /></>) },
  PY: { bg: "#d52b1e", el: (<><rect y="4" width="16" height="4" fill="#fff" /><rect y="8" width="16" height="4" fill="#0038a8" /></>) },
  MX: { bg: "#006847", el: (<><rect x="5.33" width="5.34" height="12" fill="#fff" /><rect x="10.67" width="5.33" height="12" fill="#ce1126" /></>) },
  AU: { bg: "#012169", el: <rect width="7" height="6" fill="#012169" stroke="#fff" strokeWidth=".4" /> },
  BM: { bg: "#cf142b", el: (<><rect width="7" height="6" fill="#012169" stroke="#fff" strokeWidth=".3" /><line x1="0" y1="0" x2="7" y2="6" stroke="#fff" strokeWidth=".4" /><line x1="7" y1="0" x2="0" y2="6" stroke="#fff" strokeWidth=".4" /></>) },
  PH: { bg: "#0038a8", el: (<><rect y="6" width="16" height="6" fill="#ce1126" /><polygon points="0,0 0,12 7,6" fill="#fff" /></>) },
  CA: { bg: "#fff", el: (<><rect width="5.3" height="12" fill="#d52b1e" /><rect x="10.7" width="5.3" height="12" fill="#d52b1e" /><polygon points="8,4 8.7,5.2 10,5 9,6 10.5,6.6 8.7,7 8,9 7.3,7 5.5,6.6 7,6 6,5 7.3,5.2" fill="#d52b1e" /></>) },
  CI: { bg: "#fff", el: (<><rect width="5.33" height="12" fill="#f77f00" /><rect x="10.67" width="5.33" height="12" fill="#009e60" /></>) },
  BJ: { bg: "#fcd116", el: (<><rect width="6" height="12" fill="#008751" /><rect x="6" width="10" height="6" fill="#fcd116" /><rect x="6" y="6" width="10" height="6" fill="#e8112d" /></>) },
  TG: { bg: "#006a4e", el: (<><rect y="2.4" width="16" height="2.4" fill="#fcd116" /><rect y="7.2" width="16" height="2.4" fill="#fcd116" /><rect width="5" height="5" fill="#d21034" /></>) },
  MZ: { bg: "#007168", el: (<><rect y="3" width="16" height="2" fill="#000" /><rect y="5" width="16" height="2" fill="#fff" /><rect y="7" width="16" height="2" fill="#fcd116" /><rect y="9" width="16" height="3" fill="#d21034" /><polygon points="0,0 0,12 6,6" fill="#d21034" /></>) },
  GB: { bg: "#012169", el: (<><line x1="0" y1="0" x2="16" y2="12" stroke="#fff" strokeWidth="1.2" /><line x1="16" y1="0" x2="0" y2="12" stroke="#fff" strokeWidth="1.2" /><rect x="7" width="2" height="12" fill="#fff" /><rect y="5" width="16" height="2" fill="#fff" /><rect x="7.5" width="1" height="12" fill="#c8102e" /><rect y="5.5" width="16" height="1" fill="#c8102e" /></>) },
  JP: { bg: "#fff", el: <circle cx="8" cy="6" r="3" fill="#bc002d" /> },
  KR: { bg: "#fff", el: (<><circle cx="8" cy="6" r="2.4" fill="#cd2e3a" /><path d="M5.6 6 A2.4 2.4 0 0 1 10.4 6 A1.2 1.2 0 0 0 8 6 A1.2 1.2 0 0 1 5.6 6 Z" fill="#0047a0" /></>) },
  SG: { bg: "#fff", el: (<><rect y="0" width="16" height="6" fill="#ed2939" /><circle cx="4" cy="3" r="1.6" fill="#fff" /><circle cx="4.7" cy="3" r="1.4" fill="#ed2939" /></>) },
  VN: { bg: "#da251d", el: <polygon points="8,3 8.7,5.2 10.2,5.2 9,6.3 9.5,8 8,7 6.5,8 7,6.3 5.8,5.2 7.3,5.2" fill="#ffff00" /> },
  IL: { bg: "#fff", el: (<><rect y="1.5" width="16" height="1.5" fill="#0038b8" /><rect y="9" width="16" height="1.5" fill="#0038b8" /><polygon points="8,4 10,7 6,7" fill="none" stroke="#0038b8" strokeWidth=".5" /><polygon points="8,8 10,5 6,5" fill="none" stroke="#0038b8" strokeWidth=".5" /></>) },
  AE: { bg: "#009e60", el: (<><rect y="4" width="16" height="4" fill="#fff" /><rect y="8" width="16" height="4" fill="#000" /><rect width="4" height="12" fill="#ff0000" /></>) },
  GH: { bg: "#ce1126", el: (<><rect y="4" width="16" height="4" fill="#fcd116" /><rect y="8" width="16" height="4" fill="#006b3f" /><polygon points="8,5 8.6,7 7.4,7" fill="#000" /></>) },
  AO: { bg: "#cc092f", el: (<><rect y="6" width="16" height="6" fill="#000" /><circle cx="5" cy="6" r="2" fill="none" stroke="#ffcc00" strokeWidth=".5" /></>) },
  GW: { bg: "#fcd116", el: (<><rect y="6" width="16" height="6" fill="#009e49" /><rect width="6" height="12" fill="#ce1126" /></>) },
  NG: { bg: "#fff", el: (<><rect width="5.3" height="12" fill="#008751" /><rect x="10.7" width="5.3" height="12" fill="#008751" /></>) },
  SN: { bg: "#fcd116", el: (<><rect width="5.3" height="12" fill="#00853f" /><rect x="10.7" width="5.3" height="12" fill="#e31b23" /></>) },
  ML: { bg: "#fcd116", el: (<><rect width="5.3" height="12" fill="#14b53a" /><rect x="10.7" width="5.3" height="12" fill="#ce1126" /></>) },
  CV: { bg: "#003893", el: (<><rect y="6.5" width="16" height="1.5" fill="#fff" /><rect y="8" width="16" height="0.6" fill="#cf2027" /><rect y="8.6" width="16" height="1.5" fill="#fff" /></>) },
  GN: { bg: "#ce1126", el: (<><rect x="5.3" width="5.4" height="12" fill="#fcd116" /><rect x="10.7" width="5.3" height="12" fill="#009460" /></>) },
  ER: { bg: "#0073cf", el: <polygon points="0,0 16,6 0,12" fill="#ce1126" /> },
  GM: { bg: "#ce1126", el: (<><rect y="4" width="16" height="1.2" fill="#fff" /><rect y="5.2" width="16" height="2.6" fill="#0c1c8c" /><rect y="7.8" width="16" height="1.2" fill="#fff" /><rect y="9" width="16" height="3" fill="#3a7728" /></>) },
  LR: { bg: "#bf0a30", el: (<><rect width="6" height="6" fill="#002868" /><rect y="1.2" width="16" height="1.2" fill="#fff" /><rect y="3.6" width="16" height="1.2" fill="#fff" /><rect y="6" width="16" height="1.2" fill="#fff" /><rect y="8.4" width="16" height="1.2" fill="#fff" /><rect y="10.8" width="16" height="1.2" fill="#fff" /></>) },
  ZA: { bg: "#007a4d", el: (<><polygon points="0,0 0,12 6,6" fill="#000" /><polygon points="0,0 0,12 4,6" fill="#ffb612" /></>) },
  AL: { bg: "#e41e20", el: <circle cx="8" cy="6" r="2" fill="#000" /> },
  MA: { bg: "#c1272d", el: <polygon points="8,3 8.6,5 10.5,5 9,6.2 9.5,8 8,6.8 6.5,8 7,6.2 5.5,5 7.4,5" fill="none" stroke="#006233" strokeWidth=".4" /> },
  PE: { bg: "#fff", el: (<><rect width="5.3" height="12" fill="#d91023" /><rect x="10.7" width="5.3" height="12" fill="#d91023" /></>) },
  TT: { bg: "#d51c29", el: <line x1="0" y1="12" x2="16" y2="0" stroke="#fff" strokeWidth="3" /> },
  BF: { bg: "#ef2b2d", el: (<><rect y="6" width="16" height="6" fill="#009e49" /><polygon points="8,4 8.6,5.5 10.2,5.5 9,6.5 9.4,8 8,7.2 6.6,8 7,6.5 5.8,5.5 7.4,5.5" fill="#fcd116" /></>) },
  MR: { bg: "#006233", el: <polygon points="8,3 9,5.5 11.5,5.5 9.5,7 10.2,9.5 8,8 5.8,9.5 6.5,7 4.5,5.5 7,5.5" fill="#fcd116" /> },
  NE: { bg: "#fff", el: (<><rect y="0" width="16" height="4" fill="#e05206" /><rect y="8" width="16" height="4" fill="#0db02b" /><circle cx="8" cy="6" r="1.4" fill="#e05206" /></>) },
  NL: { bg: "#fff", el: (<><rect y="0" width="16" height="4" fill="#ae1c28" /><rect y="8" width="16" height="4" fill="#21468b" /></>) },
};

type FlagSVGProps = { code: string; size?: number };
export const FlagSVG = ({ code, size = 14 }: FlagSVGProps) => {
  const p = flagPalettes[code] || { bg: "#999", el: null };
  const w = size;
  const h = Math.round((size * 12) / 16);
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 16 12"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        borderRadius: 2,
        display: "inline-block",
        flexShrink: 0,
        boxShadow: "0 0 0 0.5px rgba(0,0,0,0.18)",
      }}
      aria-hidden="true"
    >
      <rect width="16" height="12" fill={p.bg} />
      {p.el}
    </svg>
  );
};

// ============================================================================
// Full Mundus Logo (used in heroes / banners — different from <Logo /> primitive)
// ============================================================================
import mundusLogoFull from "@/assets/mundus-logo.png";
type FullMundusLogoProps = { height?: number; muted?: boolean };
export const FullMundusLogo = ({ height = 56, muted = false }: FullMundusLogoProps) => (
  <img
    src={mundusLogoFull}
    alt="Mundus Trade"
    style={{ height, width: "auto", opacity: muted ? 0.55 : 1 }}
    draggable={false}
  />
);
