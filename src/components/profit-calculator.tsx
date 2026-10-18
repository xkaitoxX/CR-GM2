"use client";

import { useState } from "react";
import {
  calculateProfit,
  DEFAULT_INPUTS,
  GOOD_DEAL_MIN_PROFIT,
  GOOD_DEAL_MIN_ROI_PERCENT,
  type ProfitInputs,
  type Verdict,
} from "@/lib/profit";

type NumberField = {
  [K in keyof ProfitInputs]: ProfitInputs[K] extends number ? K : never;
}[keyof ProfitInputs];

interface FieldSpec {
  key: NumberField;
  label: string;
  hint?: string;
  unit: "£" | "%" | "items";
}

const SECTIONS: { title: string; fields: FieldSpec[] }[] = [
  {
    title: "The item",
    fields: [
      { key: "buyPrice", label: "Price you pay", hint: "In the shop or from the supplier, per item", unit: "£" },
      { key: "sellPrice", label: "Amazon price", hint: "What the customer pays on Amazon", unit: "£" },
      { key: "quantity", label: "How many you buy", unit: "items" },
    ],
  },
  {
    title: "Amazon fees",
    fields: [
      { key: "referralFeePercent", label: "Selling fee", hint: "15% for most categories", unit: "%" },
      {
        key: "fulfilmentFee",
        label: "FBA fee per item",
        hint: "Depends on size and weight. Check Amazon's Revenue Calculator",
        unit: "£",
      },
      { key: "storageFeePerUnit", label: "Storage per item", hint: "Usually a few pence for small items", unit: "£" },
      {
        key: "digitalServicesFeePercent",
        label: "Digital services fee",
        hint: "UK extra Amazon adds on top of its fees",
        unit: "%",
      },
    ],
  },
  {
    title: "Your other costs (per item)",
    fields: [
      { key: "shippingToAmazonPerUnit", label: "Shipping to Amazon", unit: "£" },
      { key: "prepCostPerUnit", label: "Labels and bags", unit: "£" },
      { key: "otherCostsPerUnit", label: "Anything else", unit: "£" },
    ],
  },
];

const NUMBER_FIELDS = (Object.keys(DEFAULT_INPUTS) as (keyof ProfitInputs)[]).filter(
  (k): k is NumberField => typeof DEFAULT_INPUTS[k] === "number",
);

const defaultValues = () =>
  Object.fromEntries(NUMBER_FIELDS.map((k) => [k, String(DEFAULT_INPUTS[k])])) as Record<
    NumberField,
    string
  >;

const toNumber = (value: string) => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const percent = (n: number) => `${n.toFixed(1)}%`;

const VERDICTS: Record<Verdict, { title: string; text: string; className: string }> = {
  good: {
    title: "Good deal",
    text: `At least £${GOOD_DEAL_MIN_PROFIT} profit and ${GOOD_DEAL_MIN_ROI_PERCENT}% return per item.`,
    className: "bg-emerald-50 text-emerald-900 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-100",
  },
  thin: {
    title: "Thin profit",
    text: `It makes money, but less than £${GOOD_DEAL_MIN_PROFIT} per item or under ${GOOD_DEAL_MIN_ROI_PERCENT}% return.`,
    className: "bg-amber-50 text-amber-900 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-100",
  },
  loss: {
    title: "Loses money",
    text: "Don't buy at this price.",
    className: "bg-red-50 text-red-900 ring-red-600/20 dark:bg-red-950 dark:text-red-100",
  },
};

export default function ProfitCalculator() {
  const [values, setValues] = useState(defaultValues);
  const [vatRegistered, setVatRegistered] = useState(DEFAULT_INPUTS.vatRegistered);
  const [buyPriceIncludesVat, setBuyPriceIncludesVat] = useState(DEFAULT_INPUTS.buyPriceIncludesVat);

  const inputs: ProfitInputs = {
    ...(Object.fromEntries(NUMBER_FIELDS.map((k) => [k, toNumber(values[k])])) as Pick<
      ProfitInputs,
      NumberField
    >),
    vatRegistered,
    buyPriceIncludesVat,
  };
  const r = calculateProfit(inputs);
  const verdict = VERDICTS[r.verdict];

  const reset = () => {
    setValues(defaultValues());
    setVatRegistered(DEFAULT_INPUTS.vatRegistered);
    setBuyPriceIncludesVat(DEFAULT_INPUTS.buyPriceIncludesVat);
  };

  const breakdown: [string, number][] = [
    ["Amazon price", inputs.sellPrice],
    ...(vatRegistered ? ([["VAT you owe on the sale", -r.outputVat]] as [string, number][]) : []),
    ["Selling fee", -r.referralFee],
    ["FBA fee", -r.fulfilmentFee],
    ["Storage", -r.storageFee],
    ["Digital services fee", -r.digitalServicesFee],
    ...(vatRegistered ? [] : ([["VAT on Amazon fees", -r.vatOnFees]] as [string, number][])),
    ["Price you pay" + (vatRegistered && buyPriceIncludesVat ? " (after VAT back)" : ""), -r.productCost],
    ["Shipping, labels and other", -r.extraCosts],
  ];

  return (
    <div className="grid gap-6 pb-24 lg:grid-cols-[1fr_380px] lg:items-start lg:pb-0">
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        {SECTIONS.map((section) => (
          <fieldset key={section.title} className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200 sm:p-5 dark:bg-zinc-900 dark:ring-zinc-800">
            <legend className="sr-only">{section.title}</legend>
            <h2 className="mb-4 text-base font-semibold">{section.title}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {section.fields.map((field) => (
                <NumberInput
                  key={field.key}
                  field={field}
                  value={values[field.key]}
                  onChange={(value) => setValues((v) => ({ ...v, [field.key]: value }))}
                />
              ))}
            </div>
          </fieldset>
        ))}

        <fieldset className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200 sm:p-5 dark:bg-zinc-900 dark:ring-zinc-800">
          <legend className="sr-only">Tax</legend>
          <h2 className="mb-4 text-base font-semibold">Tax (VAT)</h2>
          <div className="space-y-4">
            <Checkbox
              id="vatRegistered"
              checked={vatRegistered}
              onChange={setVatRegistered}
              label="I'm VAT registered"
            />
            {vatRegistered ? (
              <>
                <Checkbox
                  id="buyPriceIncludesVat"
                  checked={buyPriceIncludesVat}
                  onChange={setBuyPriceIncludesVat}
                  label="The price I pay includes VAT I can claim back (I get a VAT receipt)"
                />
                <div className="sm:w-1/2">
                  <NumberInput
                    field={{ key: "vatRatePercent", label: "VAT rate", unit: "%" }}
                    value={values.vatRatePercent}
                    onChange={(value) => setValues((v) => ({ ...v, vatRatePercent: value }))}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Not VAT registered: Amazon adds {values.vatRatePercent || 0}% VAT to its fees, so they cost
                you more. You don&apos;t charge VAT on your sales.
              </p>
            )}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={reset}
          className="rounded-full px-4 py-2 text-sm font-medium text-zinc-700 ring-1 ring-zinc-300 hover:bg-zinc-100 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800"
        >
          Reset to example
        </button>
      </form>

      <section aria-label="Result" className="space-y-4 lg:sticky lg:top-6">
        <div className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Profit per item</p>
          <p
            className={`mt-1 text-4xl font-semibold tabular-nums ${r.profitPerUnit < 0 ? "text-red-600 dark:text-red-400" : ""}`}
          >
            {gbp.format(r.profitPerUnit)}
          </p>
          <div className={`mt-4 rounded-xl p-3 ring-1 ring-inset ${verdict.className}`}>
            <p className="font-semibold">{verdict.title}</p>
            <p className="text-sm">{verdict.text}</p>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Stat label="Return on money" value={percent(r.roiPercent)} />
            <Stat label="Profit margin" value={percent(r.marginPercent)} />
            <Stat
              label="Lowest price for a good deal"
              value={r.goodDealSellPrice === null ? "None" : gbp.format(Math.ceil(r.goodDealSellPrice * 100) / 100)}
            />
            <Stat
              label="Lowest price before a loss"
              value={r.breakEvenSellPrice === null ? "None" : gbp.format(r.breakEvenSellPrice)}
            />
          </dl>
        </div>

        <div className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <h2 className="mb-3 text-base font-semibold">For {inputs.quantity} items</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="You spend" value={gbp.format(r.totalInvestment)} />
            <Stat label="You make" value={gbp.format(r.totalProfit)} />
          </dl>
        </div>

        <div className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <h2 className="mb-3 text-base font-semibold">Where the money goes (per item)</h2>
          <table className="w-full text-sm">
            <tbody>
              {breakdown.map(([label, amount]) => (
                <tr key={label} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                  <td className="py-1.5 text-zinc-600 dark:text-zinc-400">{label}</td>
                  <td className="py-1.5 text-right tabular-nums">{gbp.format(amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-zinc-300 font-semibold dark:border-zinc-700">
                <td className="pt-2">Profit</td>
                <td className="pt-2 text-right tabular-nums">{gbp.format(r.profitPerUnit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 text-sm">
          <span>
            Profit per item{" "}
            <strong className={`tabular-nums ${r.profitPerUnit < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
              {gbp.format(r.profitPerUnit)}
            </strong>
          </span>
          <span className="text-zinc-600 dark:text-zinc-400">
            Return <strong className="tabular-nums text-zinc-900 dark:text-zinc-100">{percent(r.roiPercent)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

function NumberInput({
  field,
  value,
  onChange,
}: {
  field: FieldSpec;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `field-${field.key}`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {field.label}
      </label>
      <div className="mt-1 flex items-center rounded-lg ring-1 ring-zinc-300 focus-within:ring-2 focus-within:ring-zinc-900 dark:ring-zinc-700 dark:focus-within:ring-zinc-100">
        {field.unit === "£" && <span className="pl-3 text-zinc-500">£</span>}
        <input
          id={id}
          type="number"
          inputMode={field.unit === "items" ? "numeric" : "decimal"}
          min={0}
          step={field.unit === "items" ? 1 : 0.01}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={field.hint ? `${id}-hint` : undefined}
          className="w-full min-w-0 bg-transparent px-3 py-2 tabular-nums outline-none"
        />
        {field.unit !== "£" && <span className="pr-3 text-zinc-500">{field.unit}</span>}
      </div>
      {field.hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {field.hint}
        </p>
      )}
    </div>
  );
}

function Checkbox({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 text-sm">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 accent-zinc-900 dark:accent-zinc-100"
      />
      <span>{label}</span>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
      <dt className="text-zinc-600 dark:text-zinc-400">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
