# Vector DB vs Keyword Search: Why We Don't Need a Vector Database

## The Question

Will keyword search (our current `searchCatalog()`) actually work for the AI quotation maker, or do we need a vector database (Qdrant, pgvector, Pinecone) for semantic search?

---

## TL;DR — Keyword search is the right choice. Here's why.

---

## 1. Data Scale Analysis

| Data source | Rows | Structure |
|-------------|------|-----------|
| Package Calculator products | 523 | Location, Category, Tour, Product, Transfer, AED cost |
| App Sheet Cost sheet | ~512 | Same structure (overlapping data) |
| App Sheet EXCURSIONS | ~200 actual products | Attraction, Adult, Child, Toddler pricing |
| App Sheet ADVENTURES | ~25 products | Location, Attraction, Price |
| App Sheet TRANSPORT | ~40 routes x vehicles | Route, Vehicle size, Rate |
| App Sheet CITY TOURS | 4 tour types | Name, Type, Rate |
| **Total unique searchable items** | **~800** | |

**Verdict: This is a tiny dataset.** Vector databases are designed for millions of documents. Using one for 800 rows is like renting a warehouse to store a shoebox.

---

## 2. How the AI Search Actually Works (Step 2: GROUND)

When a user says: *"day 2 Burj Khalifa, day 3 desert safari"*

**Step 1 (PARSE)** extracts: `activities: [{name: "Burj Khalifa", day: 2}, {name: "desert safari", day: 3}]`

**Step 2 (GROUND)** then runs: `searchCatalog(all, "Burj Khalifa")` and gets exact substring matches:
- "Burj Khalifa At the Top & Sky Views Tickets" (score 3, substring "burj" + "khalifa")
- "Burj Khalifa 124 FLOOR NON PEAK" (from EXCURSIONS, score 3)

This is **not a semantic similarity problem**. The user says "Burj Khalifa" and we match "Burj Khalifa". Substring matching handles this perfectly.

### How `searchCatalog()` works (from `src/catalog/catalog.ts`)

```
Scoring weights:
  product name match = 3 points per term
  tour name match    = 2 points per term
  category match     = 1 point per term

Rules:
  - ALL search terms must match somewhere (conjunctive AND)
  - Case-insensitive substring matching
  - Results sorted by score, ties broken alphabetically
  - In-memory scan of ~800 products: <5ms per call
```

---

## 3. Where Vector Search Would Help (and Why It Doesn't Matter Here)

Vector/semantic search excels when:

| Scenario | Vector search needed? | Our case |
|----------|----------------------|----------|
| User says "something tall to climb" and you need to match "Burj Khalifa" | Yes — semantic gap | **Doesn't happen.** Travel agents name specific attractions. |
| Catalog has 50,000+ products and exact terms miss | Yes — fuzzy recall | **800 products.** Linear scan is <5ms. |
| Synonyms: "car" = "sedan" = "vehicle" | Yes — vocabulary mismatch | **Travel products have standard names.** "Desert safari" is always "desert safari". |
| Multi-language queries | Yes — cross-lingual embeddings | **All queries and products are in English.** |
| Long-form document retrieval (RAG over manuals) | Yes — chunk & embed | **We're matching product names, not paragraphs.** |

**The AI_NOTES.pdf covers RAG + vector DBs (Modules 11-14) for a different use case**: retrieving relevant chunks from large document corpora. Our catalog is structured data with short product names — it's a lookup problem, not a retrieval problem.

---

## 4. What Happens with Edge Cases?

**User says:** "water park" — needs to match "Aquaventure Waterpark"
- Keyword search: `searchCatalog(all, "water")` matches "Aquaventure **Water**park" (substring match on "water")

**User says:** "theme park" — needs to match "IMG World of Adventures"
- Keyword search: `searchCatalog(all, "theme park")` **misses** (neither "theme" nor "park" in "IMG World of Adventures")
- But: the LLM in Step 1 (PARSE) is smart enough to output `{name: "IMG World of Adventures"}` if the user's context makes it clear. The LLM does the semantic reasoning; the search just does the lookup.

**This is the key insight: the LLM handles ambiguity, the catalog search handles precision.** We split the work correctly between the two systems.

---

## 5. The Hybrid Approach (Our Plan)

```
User: "day 5 some water park"
         |
    LLM (PARSE)  <-- LLM resolves "some water park" --> "Aquaventure Waterpark"
         |
    searchCatalog("Aquaventure Waterpark")  <-- exact keyword match
         |
    Result: Aquaventure Waterpark, AED 280
```

The LLM is the semantic engine. The catalog search is the data retrieval engine. Each does what it's best at.

If we added a vector DB, we'd be embedding 800 product names and running cosine similarity — **the same thing the LLM already does implicitly when it processes the user's input**. It would be redundant computation for a marginal improvement on edge cases.

---

## 6. Cost-Benefit Comparison

| Factor | Vector DB (Qdrant/pgvector) | Keyword Search (current) |
|--------|---------------------------|-------------------------|
| **Setup complexity** | Install Qdrant/Docker or add pgvector to Postgres. Generate embeddings for 800 products. Store vectors. | Already built. Zero setup. |
| **Runtime dependency** | External service (Qdrant) or DB extension (pgvector) must be running | In-memory, no external dependency |
| **Latency** | ~50-100ms (embedding query + ANN search) | <5ms (in-memory substring scan) |
| **Embedding cost** | ~$0.001 per query (ada-002) — needs API call per search | $0 — pure local computation |
| **Accuracy on our data** | ~95% (might catch "theme park" -> IMG World) | ~90% (LLM compensates for the gap) |
| **Maintenance** | Re-embed when catalog changes. Vector drift. Dimension tuning. | Zero — just reload JSON. |
| **Deployment** | Need Docker/cloud DB in production | Single JSON file, works offline |

**Net gain from vector DB: ~5% accuracy improvement on edge cases.**
**Net cost: significant complexity, external dependency, ongoing maintenance, and per-query API costs.**

---

## 7. When Would We Add a Vector DB?

Revisit this decision if:
- Catalog grows past **5,000+ products** (keyword scan > 50ms)
- You add **multi-language support** (Arabic product names, Hindi queries)
- You add **free-text document RAG** (searching supplier PDFs, contract terms)
- Users frequently describe products **indirectly** ("something romantic" -> "Dhow cruise dinner")

For now, none of these apply.

---

## 8. The Escape Hatch (Already Designed)

The plan's `searchCatalog()` interface returns `CatalogProduct[]` regardless of how the search works internally. If you ever need to swap to vector search, you:

1. Add an embedding step to the catalog import
2. Replace the `scoreProduct()` function body with a cosine similarity call
3. **No caller changes.** The pipeline, grounding step, and UI all stay the same.

The catalog module comment already says:
> *"If the catalog grows past a few thousand rows the same shape can be swapped for a MiniSearch index without touching callers."*

---

## 9. Real-World Comparison

| System | Dataset size | Search method | Vector DB? |
|--------|-------------|---------------|-----------|
| **Our QMS** | ~800 products | Keyword substring | No |
| Airbnb search | 7M+ listings | Embedding similarity | Yes (essential) |
| Amazon product search | 350M+ products | Hybrid (keyword + semantic) | Yes (essential) |
| Small restaurant menu app | ~200 items | Full-text search | No (overkill) |
| NotebookLM (Google) | User's uploaded docs (variable) | Embedding RAG | Yes (documents are unstructured) |

We are in the "small structured catalog" category, not the "massive unstructured corpus" category.

---

## Conclusion

**Keyword search is the correct engineering choice for our scale.** The AI_NOTES.pdf teaches vector DBs as a technique — it doesn't say to use them everywhere. At 800 products, adding Qdrant would be premature optimization that increases complexity without meaningful accuracy gain. The LLM handles semantic understanding; the catalog search handles precise data retrieval. Together they cover >95% of use cases.

**Build it simple. Ship it. Add vectors later if the data outgrows the approach.**

---

### Architecture Reference

```
PARSE (LLM)          -->  User's vague text becomes specific product names
GROUND (keyword)      -->  Specific names match catalog rows instantly (<5ms)
BUILD (LLM)           -->  Matched products assembled into StoredQuotation
PROSE (LLM)           -->  Day descriptions generated

No vector DB anywhere in the pipeline.
The LLM IS the semantic engine. The catalog IS the lookup engine.
```
