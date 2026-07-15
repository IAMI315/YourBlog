import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type PublicBackLinkProps = {
  href?: string;
  label?: string;
};

export function PublicBackLink({ href = "/", label = "返回首页" }: PublicBackLinkProps) {
  return (
    <Link className="public-back-link" href={href}>
      <ArrowLeft aria-hidden="true" size={16} strokeWidth={2} />
      <span>{label}</span>
    </Link>
  );
}
