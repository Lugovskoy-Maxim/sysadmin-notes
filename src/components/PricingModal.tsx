"use client";

import { X } from "lucide-react";
import { PricingPanel } from "./PricingPanel";
import type { BillingStatus } from "@/lib/types";

type PricingModalProps = {
  token: string;
  onClose: () => void;
  onSubscribed?: (billing: BillingStatus) => void;
};

export function PricingModal({ token, onClose, onSubscribed }: PricingModalProps) {
  return (
    <div className="modal-overlay pricing-modal-overlay" onClick={onClose}>
      <div className="modal-card pricing-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <p className="overline">Подписка</p>
            <h3>Тарифы Pro и Team</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </header>
        <div className="pricing-modal-body">
          <PricingPanel token={token} compact onSubscribed={onSubscribed} />
        </div>
      </div>
    </div>
  );
}