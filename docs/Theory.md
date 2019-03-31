# Theory of Queries on Graphs

## Data structures

Graffy defines two data structures, Graff (a subset of graphs) and Query, and several operations on them.

### Graffs

**Graffs** are partial views of the application’s data.

They are connected, directed graphs with a few restrictions. They must have exactly one “root” node (a node with no incoming edges). Only “leaf” nodes (nodes with no outgoing edges) store values, which may be null to indicate the absence of a value. All edges must have string labels.

Such a Graph is completely described by its set of leaf nodes, where each leaf node contains a value and a set of paths (sequences of labels) from the root to that leaf. A leaf might have infinitely many paths - graphs are not required to be (and in practice aren’t) acyclic.

Every leaf must have exactly one path that is its “canonical” path. Leaves are considered equivalent if they have the same canonical path, and all Graffs that include a leaf must include its canonical path.

Graffs often contain finite number of non-null leaves and an infinite number of null leaves that represent keys that are known to not exist. In practice, all the paths to these null leaves can be succinct represented as open intervals of lexicographically ordered strings (e.g. All keys in the range [“parrot”…“python”] are null).

### Queries

**Queries** represent data requirements. They are trees and are completely described by the set of paths from the root to each leaf.

Queries may contain an infinite number of paths, when intervals of keys are requested.

### Formal definitions

```
Graff         ::= {* Leaf *}
Leaf          ::= LeafPaths, Value, Clock
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
Clock         ::= Non-negative Real
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
  CanonicalPath, LinkedPaths₁ + LinkedPaths₂, Value₁, Clock₁ if Clock₁ > Clock₂
  CanonicalPath, LinkedPaths₁ + LinkedPaths₂, Value₂, Clock₂ if Clock₂ > Clock₁

# Leaf union is not defined if the clocks are identical and the values differ.

# Path unions are calculated by the union of their segments taken in order.

KeyRange₁ + KeyRange₂ ::=
  min(MinKey₁, MinKey₂), max(MaxKey₁, MaxKey₂)

KeyRangeFirst₁ + KeyRangeFirst₂ ::=
  MinKey, max(MaxKey₁, MaxKey₂), max(First₁, First₂)

KeyRangeLast₁ + KeyRangeLast₂ ::=
  max(MinKey₁, MinKey₂), MaxKey, max(Last₁, Last₂)
```

## Operations

### Graff union

- **G₁ + G₂ = G₃**

As Graffs are sets of leaves, this is analogous to a set union.

```
Graff₁ + Graff₂ = {
  Leaf₁ where ∄ Leaf₂ : Leaf₁ ~ Leaf₂
  Leaf₂ where ∄ Leaf₁ : Leaf₁ ~ Leaf₂
  Leaf₁ + Leaf₂ where Leaf₁ ~ Leaf₂
  ∀ Leaf₁ ∈ Graff₁, Leaf₂ ∈ Graff₂
}
```

If both Graffs contain equivalent leaves (i.e. with the same canonical path),

In Graffy, this operation is used to merge changes into the cache and to aggregate results from multiple sources. This operation should be commutative and associative:

- G₁ + G₂ = G₂ + G₁
- G₁ + (G₂ + G₃) = (G₁ + G₂) + G₃

### Query union

- **Q₁ + Q₂ = Q₃**

Queries are sets, and this is a set union.

Aggregate queries from multiple components. This operation should be commutative and associative:

- Q₁ + Q₂ = Q₂ + Q₁
- Q₁ + (Q₂ + Q₃) = (Q₁ + Q₂) + Q₃

### Graff difference

- **G₁ − G₂ = G₃**

As Graffs are sets of leaves, this is analogous to a set difference.

```
Graff₁ − Graff₂ = {
  Leaf₁ where ∄ Leaf₂ ∈ Graff₂ : Leaf₁ ~ Leaf₂
  ∀ Leaf₁ ∈ Graff₁
}
```

When processing a write operation with multiple sinks, compute the pending changes after each partial write. It should be reversible using Graff union:

- (G₁ − G₂) + G₂ = G₁

### Query reduction

- **Q₁ − G = Q₂**

When fulfilling a read operation from multiple sources, compute the pending query after partial read. Also used to compute additional data requirements before notifying a change to each live query.

```
Query − Graff = {
  QueryPath ∀ QueryPath ∈ Query where ∄ LeafPath ∈ Leaf ∈ Graff :
    LeafPath = QueryPath
}
```

### Query normalization

- **Q₁ * G = Q₂**

Replace the paths in Q that match a non-canonical path in G with the corresponding canonical paths. This prepares live queries for filtering change graffs, which will always include canonical paths but may not include the non-canonical paths used in the original query.

### Query intersection

- **Q ∩ G₁ = G₂**

This is analogous to an intersection between the sets of paths; both CanonicalPath and LinkedPaths are considered paths of a Leaf.

```
Query ∩ Graff = {
  Leaf ∀ Leaf ∈ Graff where ∃ LeafPath ∈ Leaf, QueryPath ∈ Query :
    LeafPath = QueryPath
}
```

Fulfil a query using information in a cache. When a change has been written, computes the parts of that change that are relevant to each pending live query.

This operation should be distributive over Query Union:

- (Q₁ + Q₂) ∩ G = Q₁ ∩ G + Q₂ ∩ G

---

TODO: Write formal definitions of each operation, and proofs that the identities hold.
