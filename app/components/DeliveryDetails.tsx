import type { Order } from "@/lib/types";

/** Delivery/customer details snapshotted on the order at placement time. */
export default function DeliveryDetails({
  order,
  headingId = `delivery-details-${order.id}`,
}: {
  order: Order;
  headingId?: string;
}) {
  const fields: { label: string; value?: string | null; wide?: boolean }[] = [
    { label: "Name", value: order.customer_name },
    { label: "Email", value: order.customer_email },
    { label: "Phone", value: order.customer_phone },
    { label: "Address", value: order.customer_address, wide: true },
  ];

  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-2xl border border-[var(--color-hairline)] bg-white"
    >
      <h2
        id={headingId}
        className="border-b border-[var(--color-hairline)] bg-[var(--color-canvas)] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
      >
        Delivery details
      </h2>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 py-4 text-sm sm:grid-cols-3">
        {fields.map(({ label, value, wide }) => (
          <div key={label} className={wide ? "sm:col-span-3" : undefined}>
            <dt className="text-slate-500">{label}</dt>
            <dd className="mt-0.5 whitespace-pre-line break-words font-medium text-slate-900">
              {value?.trim() ? value : "—"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
