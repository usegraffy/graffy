# Theory of Queries on Graphs

Graffy is built on a sound mathematical theory of data and queries. There are two basic types - the Graph, containing data, and the Query, representing _data requirements_. These types are designed to have operations like addition, subtraction, intersection etc. that behave intuitively - that is, obeying associative, commutative and distributive identities.

This is the key idea that gives Graffy its advanced capabilities.

Take, for example, the _add_ and _subtract_ operations on queries. Different components on a page may make separate queries, and Graffy can add them up into a single, de-duplicated query that is sent to the backend. Edge servers can likewise combine queries from multiple clients before hitting backend services.

Similarly, the _merge_ operation on graphs can be used to combine results from the backend with the cache, or to combine live query change events with known results. The graph data structure is [conflict-free](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type) for the merge operation, so this is resilient to out-of-order updates.

Other key operations include _intersection_ and _difference_ between a query and a graph. When the graph contains cached data, intersection returns a sub-graph containing only the required data, while difference returns a new query for data that is not present in the cache.

## Data structures

### Graphs

**Graphs** are partial views of the application’s data.

They are connected, directed graphs with a few restrictions. They must have exactly one “root” node (a node with no incoming edges). Only “leaf” nodes (nodes with no outgoing edges) store values, which may be null to indicate the absence of a value. All edges must have string labels.

Such a Graph is completely described by its set of leaf nodes, where each leaf node contains a value and a set of paths (sequences of labels) from the root to that leaf. A leaf might have infinitely many paths - graphs are not required to be (and in practice aren’t) acyclic.

Every leaf must have exactly one path that is its “canonical” path. Leaves are considered equivalent if they have the same canonical path, and all Graphs that include a leaf must include its canonical path.

Graphs often contain finite number of non-null leaves and an infinite number of null leaves that represent keys that are known to not exist. In practice, all the paths to these null leaves can be succinct represented as open intervals of lexicographically ordered strings (e.g. All keys in the range [“parrot”…“python”] are null).

### Queries

**Queries** represent data requirements. They are trees and are completely described by the set of paths from the root to each leaf.

Queries may contain an infinite number of paths, when intervals of keys are requested.

### Formal definitions

```
Graph         ::= {* Leaf *}
Leaf          ::= LeafPaths, Value, Version
LeafPaths     ::= CanonicalPath, LinkedPaths
CanonicalPath ::= { Key }
LinkedPaths   ::= {* LinkedPath *}
LinkedPath    ::= { Key }, LeafKey
LeafKey       ::= Key | KeyRange

Query         ::= {* QueryPath *}
QueryPath     ::= { QueryKey }
QueryKey      ::= Key | KeyRange | KeyRangeFirst | KeyRangeLast

Key           ::= String
KeyRange      ::= MinKey, MaxKey
KeyRangeFirst ::= MinKey, MaxKey, First
KeyRangeLast  ::= MinKey, MaxKey, Last
Value         ::= Scalar | Null
Version       ::= Non-negative Real
First         ::= Non-negative Integer
Last          ::= Non-negative Integer

# {* ... *} indicates a set: no two items may be equivalent
```

### Equivalence

```
# Leaves with the same canonical path are equivalent
Leaf₁ ~ Leaf₂ ⇔ CanonicalPath₁ = CanonicalPath₂

# Paths are equivalent if their segments, taken in order, are equivalent.

# KeyRanges that overlap are equivalent
KeyRange₁ ~ KeyRange₂ ⇔ (MinKey₁ ≤ MinKey₂ ∧ MaxKey₁ ≥ MinKey₂) ∨
                        (MinKey₁ ≤ MaxKey₂ ∧ MaxKey₁ ≥ MaxKey₂)

# KeyRangeFirst and KeyRangeLast are equivalent if the anchor matches
KeyRangeFirst₁ ~ KeyRangeFirst₂ ⇔ MinKey₁ = MinKey₂
KeyRangeLast₁ ~ KeyRangeLast₂ ⇔ MaxKey₁ = MaxKey₂
```

If an operation would result in two equivalent elements in a set, the union of
those elements is used instead.

```
Leaf₁ + Leaf₂ ::=
  CanonicalPath, LinkedPaths₁ + LinkedPaths₂, Value₁, Version₁ if Version₁ > Version₂
  CanonicalPath, LinkedPaths₁ + LinkedPaths₂, Value₂, Version₂ if Version₂ > Version₁

# Leaf union is not defined if the versions are identical and the values differ.

# Path unions are calculated by the union of their segments taken in order.

KeyRange₁ + KeyRange₂ ::=
  min(MinKey₁, MinKey₂), max(MaxKey₁, MaxKey₂)

KeyRangeFirst₁ + KeyRangeFirst₂ ::=
  MinKey, max(MaxKey₁, MaxKey₂), max(First₁, First₂)

KeyRangeLast₁ + KeyRangeLast₂ ::=
  max(MinKey₁, MinKey₂), MaxKey, max(Last₁, Last₂)
```

## Operations

### Graph union

- **G₁ + G₂ = G₃**

As Graphs are sets of leaves, this is analogous to a set union.

```
Graph₁ + Graph₂ = {
  Leaf₁ where ∄ Leaf₂ : Leaf₁ ~ Leaf₂
  Leaf₂ where ∄ Leaf₁ : Leaf₁ ~ Leaf₂
  Leaf₁ + Leaf₂ where Leaf₁ ~ Leaf₂
  ∀ Leaf₁ ∈ Graph₁, Leaf₂ ∈ Graph₂
}
```

If both Graphs contain equivalent leaves (i.e. with the same canonical path),

In Graffy, this operation is used to merge changes into the cache and to aggregate results from multiple sources. This operation should be commutative and associative:

- G₁ + G₂ = G₂ + G₁
- G₁ + (G₂ + G₃) = (G₁ + G₂) + G₃

### Query union

- **Q₁ + Q₂ = Q₃**

Queries are sets, and this is a set union.

Aggregate queries from multiple components. This operation should be commutative and associative:

- Q₁ + Q₂ = Q₂ + Q₁
- Q₁ + (Q₂ + Q₃) = (Q₁ + Q₂) + Q₃

### Graph difference

- **G₁ − G₂ = G₃**

As Graphs are sets of leaves, this is analogous to a set difference.

```
Graph₁ − Graph₂ = {
  Leaf₁ where ∄ Leaf₂ ∈ Graph₂ : Leaf₁ ~ Leaf₂
  ∀ Leaf₁ ∈ Graph₁
}
```

When processing a write operation with multiple sinks, compute the pending changes after each partial write. It should be reversible using Graph union:

- (G₁ − G₂) + G₂ = G₁

### Query reduction

- **Q₁ − G = Q₂**

When fulfilling a read operation from multiple sources, compute the pending query after partial read. Also used to compute additional data requirements before notifying a change to each live query.

```
Query − Graph = {
  QueryPath ∀ QueryPath ∈ Query where ∄ LeafPath ∈ Leaf ∈ Graph :
    LeafPath = QueryPath
}
```

### Query multiplication

- **Q₁ \* G = Q₂**

For each path in Q that matches a non-canonical path in G, add the corresponding canonical paths to the query. This prepares live queries for filtering change graphs, which will always include canonical paths but may not include the non-canonical paths used in the original query.

### Query intersection

- **Q ∩ G₁ = G₂**

This is analogous to an intersection between the sets of paths; both CanonicalPath and LinkedPaths are considered paths of a Leaf.

```
Query ∩ Graph = {
  Leaf ∀ Leaf ∈ Graph where ∃ LeafPath ∈ Leaf, QueryPath ∈ Query :
    LeafPath = QueryPath
}
```

Fulfil a query using information in a cache. When a change has been written, compute the parts of that change that are relevant to each pending live query.

This operation should be distributive over Query Union:

- (Q₁ + Q₂) ∩ G = Q₁ ∩ G + Q₂ ∩ G

---

## Properties

### CRDT Property

### Live Query Property

The live query property requires that the final state of the client's knowledge should be independent of whether it is materialized from a stream of changes or by polling the state of the server.

Let G₁ be the initial state of the server, and G₂ a server-side change to this state. Let G₃ be the final state, given by G₃ = G₁ + C.

Let Q be the query made by a client, and let R₁ and R₃ be the result of making the query when the server state is G₁ and G₃ respectively, and R₂ be the live update pushed from the server when the change C occurs.

The live query property can be stated as R₃ ⊆ R₁ + R₂. This requires that:

R₂ ⊇ R₃ - R₁
R₂ ⊇ (Q ∩ (G₁ + C)) - (Q ∩ G₁)

R₁ = Q ∩ G₁
R₃ = Q ∩ G₃

R₂ = (Q \* R₁) ∩ G₂

TODO: Write proofs of each property.
