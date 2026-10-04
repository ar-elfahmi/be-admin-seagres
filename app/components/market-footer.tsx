"use client";

import SeagresLogo from "./seagres-logo";

export interface FooterItem {
  label: string;
  onClick?: () => void;
  href?: string;
}

export interface FooterGroup {
  title: string;
  items: FooterItem[];
}

export interface MarketFooterProps {
  tagline: string;
  groups: FooterGroup[];
}

function FooterLink({ item }: { item: FooterItem }) {
  if (item.href) {
    return (
      <a className="footer-action" href={item.href}>
        {item.label}
      </a>
    );
  }
  return (
    <button type="button" onClick={item.onClick}>
      {item.label}
    </button>
  );
}

export default function MarketFooter({ tagline, groups }: MarketFooterProps) {
  return (
    <footer className="market-footer">
      <div className="market-footer-brand">
        <SeagresLogo size={36} />
        <p>{tagline}</p>
      </div>
      {groups.map((group) => (
        <div key={group.title}>
          <b>{group.title}</b>
          {group.items.map((item, index) => (
            <FooterLink key={`${group.title}-${index}-${item.label}`} item={item} />
          ))}
        </div>
      ))}
    </footer>
  );
}
