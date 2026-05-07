import React, { createContext, useContext } from "react";
import { proxy, useSnapshot } from "valtio";

/**
 * Minimal reactive scope system
 */

const ScopeContext = createContext({});

function Scope({ value, children }) {
  const parent = useContext(ScopeContext);

  return (
    <ScopeContext.Provider
      value={{
        ...parent,
        ...value,
      }}
    >
      {children}
    </ScopeContext.Provider>
  );
}

function useScope() {
  return useContext(ScopeContext);
}

/* ========================================
 * Global scope
 * ====================================== */

const globalState = proxy({
  cart: [],
});

/* ========================================
 * App
 * ====================================== */

export default function App() {
  const products = [
    { id: 1, name: "Keyboard" },
    { id: 2, name: "Mouse" },
  ];

  return (
    <Scope value={{ global: globalState }}>
      {products.map((product) => (
        <Product key={product.id} product={product} />
      ))}
    </Scope>
  );
}

/* ========================================
 * Loop scope
 * ====================================== */

function Product({ product }) {
  const local = proxy({
    quantity: 1,
  });

  return (
    <Scope
      value={{
        product,
        local,
      }}
    >
      <Card />
    </Scope>
  );
}

/* ========================================
 * Component
 * ====================================== */

function Card() {
  const scope = useScope();

  const global = useSnapshot(scope.global);
  const local = useSnapshot(scope.local);

  return (
    <div style={{ border: "1px solid #ccc", padding: 10, marginBottom: 10 }}>
      <div>{scope.product.name}</div>

      <input
        type="number"
        value={local.quantity}
        onChange={(e) => {
          scope.local.quantity = Number(e.target.value);
        }}
      />

      <button
        onClick={() => {
          scope.global.cart.push({
            id: scope.product.id,
            quantity: local.quantity,
          });
        }}
      >
        Add
      </button>

      <div>Cart size: {global.cart.length}</div>
    </div>
  );
}