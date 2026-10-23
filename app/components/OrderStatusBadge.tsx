import { orderStatusClasses, orderStatusLabel } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${orderStatusClasses(
        status
      )}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {orderStatusLabel(status)}
    </span>
  );
}
