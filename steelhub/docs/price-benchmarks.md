# Price Benchmarks by Region

Each region shows **one benchmark price per product**. These are the reference indices to be configured. Update this table with the exact benchmarks you want to track.

## Benchmark Mapping

| Region | HRC | CRC | HDG | Rebar | Slab | Billet | PPGI | Scrap | Iron Ore | Coking Coal |
|--------|-----|-----|-----|-------|------|--------|------|-------|----------|-------------|
| Far East | China (Shanghai) | China | China | China | China | China | China | China HMS | 62% Fe CFR China | Australia FOB |
| Asia | India (Mumbai) | India | India | Turkey FOB | Turkey | Turkey | — | Turkey HMS 80:20 | 62% Fe CFR China | Australia FOB |
| CIS | Russia FOB Black Sea | — | — | Russia FOB | Russia | Russia | — | Russia HMS | — | — |
| EU | NW Europe (Germany) | NW Europe | NW Europe | S. Europe | NW Europe | — | NW Europe | EU HMS 80:20 | 62% Fe CFR China | Australia FOB |
| Africa | Egypt EXW | — | — | Egypt Rebar | — | Egypt | — | — | — | — |
| North America | US Midwest HRC | US CRC | US HDG | US Rebar | — | US Billet | — | US HMS #1 | — | — |
| South America | Brazil HRC | — | — | Brazil Rebar | Brazil Slab | Brazil Billet | — | — | 62% Fe CFR China | — |

> **"—"** = not tracked for this region (either not relevant or no reliable free source)

## Notes

- These are placeholder benchmarks. Update with the exact indices you want before going live.
- Raw materials (Iron Ore, Coking Coal, Scrap) are often global benchmarks shared across regions.
- Some products like PPGI and HDG have limited regional pricing — fill in as sources become available.
- The `country` field in `PriceResponse` will store which specific benchmark was used.

## News vs Prices

- **Prices:** One specific benchmark per product per region (this table)
- **News:** Covers ALL countries within a region, with a country filter for easier search
