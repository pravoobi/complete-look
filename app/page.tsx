/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { OCCASIONS } from "@/lib/catalog";
import { DEPTH_LABEL } from "@/lib/look";
import { SAMPLES } from "@/lib/samples";

export default function Home() {
  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-4 pt-6 sm:pt-12">
        <h1 className="font-display text-4xl leading-tight sm:text-6xl">
          One photo. Your colours.
          <br />
          The whole outfit.
        </h1>
        <p className="max-w-2xl text-lg text-[var(--muted)]">
          Other try-ons show you a dress. Complete Look shows you the whole outfit, in colours chosen for your skin tone, on you: the
          outfit, the jewellery and a lip shade matched to it, for Indian ethnic wear.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/look/${SAMPLES[0].id}`} className="rounded-full bg-[var(--accent)] px-5 py-3 text-white">
            See {SAMPLES[0].name}&apos;s look
          </Link>
          <Link href="/try" className="rounded-full border border-[var(--accent)] px-5 py-3 text-[var(--accent)]">
            Try it with your photo
          </Link>
        </div>
      </section>

      <section id="samples" className="flex flex-col gap-4">
        <div>
          <h2 className="font-display text-2xl">Sample shoppers</h2>
          <p className="text-sm text-[var(--muted)]">
            Three skin depths, three occasions. Each is a replay of a real recorded YouCam run: open it as often as you like, no sign-up, no
            units spent.
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-3">
          {SAMPLES.map((s) => {
            const final = s.layers.at(-1)?.image ?? s.outfits[0].image;
            return (
              <li key={s.id}>
                <Link href={`/look/${s.id}`} className="group block overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)]">
                  <div className="grid grid-cols-2">
                    <img src={s.photo} alt={`${s.name}, before`} className="aspect-square w-full object-cover" />
                    <img src={final} alt={`${s.name}, complete look`} className="aspect-square w-full object-cover" />
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-[var(--muted)]">
                        {DEPTH_LABEL[s.profile.depth]} depth · {OCCASIONS.find((o) => o.id === s.occasion)?.label}
                      </div>
                    </div>
                    <span className="text-[var(--accent)] transition group-hover:translate-x-1">→</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["1. Your colours", "YouCam's Facial Color Tones Analyzer measures your skin and lip colour. We rank outfits by how clearly they stand out against it, so nothing washes you out."],
          ["2. On you", "The top picks are tried on your photo with YouCam Clothes Try-On, then jewellery is layered on with Earrings and Necklace Try-On."],
          ["3. Finished", "A lip shade matched to the outfit goes on with YouCam Makeup Try-On, and the whole look lands on one product page with prices."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
            <h3 className="font-medium">{t}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
