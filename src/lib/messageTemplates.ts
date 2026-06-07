import {
  Truck,
  CreditCard,
  Clipboard,
  FileText,
  Clock,
  Edit3,
  type LucideIcon,
} from "lucide-react";

export interface MessageTemplate {
  id: string;
  icon: LucideIcon;
  labelKey: string;
  subjectKey: string;
  bodyKey: string;
}

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  { id: "shipment", icon: Truck,      labelKey: "messageViaMundus.tpl.shipment", subjectKey: "messageViaMundus.tplSubject.shipment", bodyKey: "messageViaMundus.tplBody.shipment" },
  { id: "payment",  icon: CreditCard, labelKey: "messageViaMundus.tpl.payment",  subjectKey: "messageViaMundus.tplSubject.payment",  bodyKey: "messageViaMundus.tplBody.payment"  },
  { id: "specs",    icon: Clipboard,  labelKey: "messageViaMundus.tpl.specs",    subjectKey: "messageViaMundus.tplSubject.specs",    bodyKey: "messageViaMundus.tplBody.specs"    },
  { id: "docs",     icon: FileText,   labelKey: "messageViaMundus.tpl.docs",     subjectKey: "messageViaMundus.tplSubject.docs",     bodyKey: "messageViaMundus.tplBody.docs"     },
  { id: "delay",    icon: Clock,      labelKey: "messageViaMundus.tpl.delay",    subjectKey: "messageViaMundus.tplSubject.delay",    bodyKey: "messageViaMundus.tplBody.delay"    },
  { id: "blank",    icon: Edit3,      labelKey: "messageViaMundus.tpl.blank",    subjectKey: "messageViaMundus.tplSubject.blank",    bodyKey: "messageViaMundus.tplBody.blank"    },
];

export function getTemplatesForRecordType(
  _t: "order" | "sale" | "negotiation",
): MessageTemplate[] {
  return DEFAULT_TEMPLATES;
}