import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'pratocerto.mvp.v1';

const ingredients = {
  rice: { name: 'Arroz integral', unit: 'porções', stock: 42 },
  chicken: { name: 'Frango grelhado', unit: 'porções', stock: 18 },
  vegetables: { name: 'Legumes da estação', unit: 'porções', stock: 24 },
  chickpeas: { name: 'Grão-de-bico', unit: 'porções', stock: 16 },
  pasta: { name: 'Massa artesanal', unit: 'porções', stock: 24 },
  tomato: { name: 'Molho de tomate', unit: 'porções', stock: 22 },
  cheese: { name: 'Queijo meia-cura', unit: 'porções', stock: 20 },
  salmon: { name: 'Salmão', unit: 'porções', stock: 9 },
};

const menu = [
  { id: 'frango', name: 'Bowl de frango', category: 'Clássicos', price: 32.9, emoji: '🍗', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=85', tag: 'Equilibrado', description: 'Frango grelhado, arroz integral e legumes.', recipe: { chicken: 1, rice: 1, vegetables: 1 } },
  { id: 'massa', name: 'Massa da casa', category: 'Clássicos', price: 29.9, emoji: '🍝', image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=85', tag: 'Receita da casa', description: 'Molho de tomate lento e queijo meia-cura.', recipe: { pasta: 1, tomato: 1, cheese: 1 } },
  { id: 'veggie', name: 'Bowl de grão-de-bico', category: 'Vegetariano', price: 27.9, emoji: '🥗', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=85', tag: 'Vegetariano', description: 'Grão-de-bico tostado, arroz e legumes.', recipe: { chickpeas: 1, rice: 1, vegetables: 1 } },
  { id: 'salmao', name: 'Prato de salmão', category: 'Clássicos', price: 39.9, emoji: '🍣', image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=85', tag: 'Leve', description: 'Salmão grelhado, arroz integral e legumes.', recipe: { salmon: 1, rice: 1, vegetables: 1 } },
  { id: 'massa-veggie', name: 'Massa de tomate', category: 'Vegetariano', price: 26.9, emoji: '🍅', image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=900&q=85', tag: 'Vegetariano', description: 'Massa artesanal com tomate e ervas.', recipe: { pasta: 1, tomato: 1 } },
  { id: 'bowl-duplo', name: 'Bowl da estação', category: 'Vegetariano', price: 25.9, emoji: '🥙', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=85', tag: 'Da estação', description: 'Legumes frescos, grão-de-bico e arroz.', recipe: { chickpeas: 1, rice: 1, vegetables: 1 } },
];

const regions = [
  { id: 'centro', name: 'Centro', capacity: 8 },
  { id: 'norte', name: 'Zona Norte', capacity: 6 },
  { id: 'sul', name: 'Zona Sul', capacity: 6 },
];

const initialState = {
  view: 'shop',
  category: 'Todos',
  region: 'centro',
  cart: {},
  inventory: Object.fromEntries(Object.entries(ingredients).map(([id, item]) => [id, item.stock])),
  reserved: Object.fromEntries(Object.keys(ingredients).map((id) => [id, 0])),
  slots: {},
  orders: [],
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved) return structuredClone(initialState);
    return {
      ...structuredClone(initialState),
      ...saved,
      category: saved.category === 'Mais pedidos' ? 'Clássicos' : saved.category || 'Todos',
      inventory: { ...initialState.inventory, ...saved.inventory },
      reserved: { ...initialState.reserved, ...saved.reserved },
      slots: saved.slots || {},
      orders: Array.isArray(saved.orders) ? saved.orders : [],
      cart: saved.cart || {},
    };
  } catch {
    return structuredClone(initialState);
  }
}

function nextSlots() {
  const start = new Date();
  start.setSeconds(0, 0);
  start.setMinutes(start.getMinutes() < 30 ? 30 : 60);
  return [0, 1, 2, 3].map((offset) => {
    const from = new Date(start.getTime() + offset * 30 * 60 * 1000);
    const to = new Date(from.getTime() + 30 * 60 * 1000);
    const time = (date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dateKey = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`;
    return { key: `${dateKey}-${time(from)}`, label: `${time(from)}–${time(to)}` };
  });
}

function getSlotRecord(state, regionId, slotKey) {
  return state.slots[`${regionId}|${slotKey}`] || { used: 0, reserved: 0 };
}

function availableFor(state, product) {
  return Math.max(0, Math.min(...Object.entries(product.recipe).map(([id, amount]) => Math.floor(((state.inventory[id] || 0) - (state.reserved[id] || 0)) / amount))));
}

function money(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function orderStatusLabel(order) {
  return ({
    payment_pending: 'Pagamento em confirmação',
    confirmed: 'Pedido confirmado',
    preparing: 'Em preparo',
    ready: 'Pronto para coleta',
    delivering: 'Saiu para entrega',
    delivered: 'Entregue',
    payment_failed: 'Pagamento não confirmado',
  })[order.status] || 'Atualizando pedido';
}

function Header({ view, onChangeView }) {
  return (
    <header className="topbar">
      <a className="brand" href="#inicio" aria-label="PratoCerto, início">
        <img className="brand-logo" src="/images/logo-prato-certo.png" alt="Prato Certo" />
      </a>
      <div className="topbar-right">
        <div className="service-state"><span className="service-dot" />{view === 'shop' ? 'Cozinha aberta' : 'Painel da cozinha'}</div>
        <nav className="nav-switch" aria-label="Navegação principal">
          <button type="button" className={view === 'shop' ? 'active' : ''} aria-current={view === 'shop' ? 'page' : undefined} onClick={() => onChangeView('shop')}>Cardápio</button>
          <button type="button" className={view === 'ops' ? 'active' : ''} aria-current={view === 'ops' ? 'page' : undefined} onClick={() => onChangeView('ops')}>Operação</button>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero fade-in" id="inicio">
      <img className="hero-photo" src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1800&q=88" alt="Bowl colorido de legumes frescos" fetchPriority="high" />
      <div className="hero-copy">
        <p className="eyebrow">Cozinha aberta · cardápio do dia</p>
        <h1>Comida de verdade, feita para sua pausa.</h1>
        <p>Receitas bem cuidadas, porções generosas e entrega no horário escolhido.</p>
      </div>
      <div className="hero-stamp" aria-label="Horários de entrega em janelas de 30 minutos"><div><strong>30'</strong><span>por janela</span></div></div>
    </section>
  );
}

function Menu({ state, onCategoryChange, onAdd }) {
  const categories = ['Todos', 'Clássicos', 'Vegetariano'];
  const products = menu.filter((product) => state.category === 'Todos' || product.category === state.category);

  return (
    <section className="menu-section" id="cardapio">
      <div className="section-heading"><div><h2>Cardápio de hoje</h2><p>Disponibilidade atualizada antes de cada pedido.</p></div></div>
      <div className="category-list" role="group" aria-label="Filtrar cardápio">
        {categories.map((category) => <button key={category} type="button" className={`category-button ${state.category === category ? 'active' : ''}`} aria-pressed={state.category === category} onClick={() => onCategoryChange(category)}>{category}</button>)}
      </div>
      <div className="menu-grid">
        {products.map((product) => {
          const available = availableFor(state, product);
          return (
            <article className="dish" key={product.id}>
              <div className="dish-art">
                <img className="dish-photo" src={product.image} alt={product.name} loading="lazy" onError={(event) => event.currentTarget.classList.add('failed')} />
                <span className="dish-emoji" aria-hidden="true">{product.emoji}</span>
                <span className="dish-tag">{product.tag}</span>
              </div>
              <div className="dish-content">
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <div className="dish-bottom"><span className="price">{money(product.price)}</span><button type="button" className="add-button" onClick={() => onAdd(product.id)} aria-label={`Adicionar ${product.name}`} disabled={available < 1}>+</button></div>
                <div className={`stock-note ${available > 0 && available <= 3 ? 'low' : ''}`}>{available > 3 ? 'Disponível para pedir' : available > 0 ? 'Últimas porções' : 'Indisponível no momento'}</div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function LastOrder({ order, onCheckPayment }) {
  if (!order) return null;
  const pending = order.status === 'payment_pending';
  const failed = order.status === 'payment_failed';
  const message = pending
    ? 'Não faça outro pedido nem repita o pagamento. A confirmação será registrada pela operação.'
    : failed
      ? 'A tentativa não foi confirmada. Você pode revisar seu carrinho e iniciar outra simulação.'
      : `Previsão: ${order.slotLabel} · ${order.regionName}.`;

  return (
    <div className={`last-order ${!pending && !failed ? 'success' : ''}`}>
      <strong>{orderStatusLabel(order)} · {order.id}</strong>
      <p>{message}</p>
      {pending && <button type="button" className="text-button" onClick={() => onCheckPayment(order.id)}>Verificar novamente</button>}
    </div>
  );
}

function Cart({ state, selectedSlot, slots, onRegionChange, onSelectSlot, onQuantityChange, onCheckout, onCheckPayment }) {
  const region = regions.find((item) => item.id === state.region);
  const lines = Object.entries(state.cart).filter(([, quantity]) => quantity > 0);
  const count = lines.reduce((sum, [, quantity]) => sum + quantity, 0);
  const total = lines.reduce((sum, [id, quantity]) => sum + (menu.find((product) => product.id === id)?.price || 0) * quantity, 0);
  const lastOrder = state.orders[0];
  const selectedIsOpen = slots.some((slot) => slot.key === selectedSlot && region.capacity > getSlotRecord(state, state.region, slot.key).used + getSlotRecord(state, state.region, slot.key).reserved);

  return (
    <aside className="cart-panel" id="pedido">
      <div className="cart-head"><h2>Seu pedido</h2><span className="cart-count" aria-label={`${count} itens`}>{count}</span></div>
      <div className="cart-body">
        <label className="field-label" htmlFor="region-select">Região de entrega</label>
        <select className="select-field" id="region-select" value={state.region} onChange={(event) => onRegionChange(event.target.value)}>
          {regions.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
        </select>
        <div className="cart-spacer" />
        <span className="field-label" id="slot-label">Horário disponível</span>
        <div className="slot-list" role="group" aria-labelledby="slot-label">
          {slots.map((slot) => {
            const record = getSlotRecord(state, state.region, slot.key);
            const remaining = Math.max(0, region.capacity - record.used - record.reserved);
            return <button type="button" key={slot.key} className={`slot-button ${selectedSlot === slot.key ? 'selected' : ''}`} aria-pressed={selectedSlot === slot.key} onClick={() => onSelectSlot(slot.key)} disabled={remaining === 0}><strong>{slot.label}</strong><span>{remaining === 0 ? 'Esgotado' : `${remaining} vagas restantes`}</span></button>;
          })}
        </div>
        <div className="cart-items">
          {lines.length ? lines.map(([id, quantity]) => {
            const product = menu.find((item) => item.id === id);
            if (!product) return null;
            return <div className="cart-line" key={id}><div><div className="cart-line-name">{product.name}</div><div className="cart-line-price">{money(product.price * quantity)}</div></div><div className="quantity"><button type="button" onClick={() => onQuantityChange(id, -1)} aria-label={`Remover um ${product.name}`}>−</button><span>{quantity}</span><button type="button" onClick={() => onQuantityChange(id, 1)} aria-label={`Adicionar um ${product.name}`} disabled={availableFor(state, product) <= quantity}>+</button></div></div>;
          }) : <div className="cart-empty">Seu carrinho está vazio.<br />Escolha um prato para começar.</div>}
        </div>
        <div className="cart-total"><span>Total</span><strong>{money(total)}</strong></div>
        <button type="button" className="primary-button" onClick={onCheckout} disabled={!count || !selectedIsOpen}>Confirmar pedido</button>
        <p className="reassurance">Demonstração sem cobrança real. A confirmação de pagamento ainda depende da operação.</p>
      </div>
      <LastOrder order={lastOrder} onCheckPayment={onCheckPayment} />
    </aside>
  );
}

function Shop({ state, slots, selectedSlot, onCategoryChange, onRegionChange, onSelectSlot, onAdd, onQuantityChange, onCheckout, onCheckPayment }) {
  return (
    <main className="page">
      <Hero />
      <div className="shop-layout">
        <Menu state={state} onCategoryChange={onCategoryChange} onAdd={onAdd} />
        <Cart state={state} selectedSlot={selectedSlot} slots={slots} onRegionChange={onRegionChange} onSelectSlot={onSelectSlot} onQuantityChange={onQuantityChange} onCheckout={onCheckout} onCheckPayment={onCheckPayment} />
      </div>
      <footer className="footer">PratoCerto · Preparo e entrega acompanhados pedido a pedido.</footer>
    </main>
  );
}

function CapacityPanel({ state, slots }) {
  const firstSlot = slots[0];
  const rows = regions.map((region) => {
    const record = getSlotRecord(state, region.id, firstSlot.key);
    return { region, record, remaining: Math.max(0, region.capacity - record.used - record.reserved) };
  });
  const totalCap = regions.reduce((sum, region) => sum + region.capacity, 0) * 2;
  const accepted = state.orders.filter((order) => order.createdAt >= Date.now() - 60 * 60 * 1000 && order.status !== 'payment_failed').length;
  const progress = Math.min(100, Math.round(accepted / totalCap * 100));

  return (
    <section className="ops-panel">
      <div className="panel-head"><h2>Válvula de capacidade</h2><span>Próximos 30 min · por região</span></div>
      <div className="capacity-wrap"><div className="capacity-top"><strong>{Math.max(0, totalCap - accepted)} vagas</strong><span>{accepted} de {totalCap} pedidos na última hora</span></div>
        <div className="progress"><span className={progress >= 80 ? 'warning' : ''} style={{ width: `${progress}%` }} /></div>
        <div className="capacity-foot"><span>Admissão conservadora</span><span>Limite: {totalCap} pedidos/h</span></div>
        <div className="slot-capacity-list">{rows.map(({ region, record, remaining }) => <div className="slot-capacity-row" key={region.id}><div><strong>{region.name} · {firstSlot.label}</strong><small>{record.used} confirmados · {record.reserved} aguardando pagamento</small></div><b>{remaining}/{region.capacity} vagas</b></div>)}</div>
      </div>
    </section>
  );
}

function nextOrderAction(order) {
  return ({
    payment_pending: ['Simular aprovação', 'confirm-payment'],
    confirmed: ['Iniciar preparo', 'start-prep'],
    preparing: ['Marcar pronto', 'mark-ready'],
    ready: ['Saiu para entrega', 'start-delivery'],
    delivering: ['Confirmar entrega', 'deliver'],
  })[order.status] || [];
}

function OrdersPanel({ state, onOrderAction }) {
  const orders = state.orders.filter((order) => !['delivered', 'payment_failed'].includes(order.status));
  return (
    <section className="ops-panel">
      <div className="panel-head"><h2>Fila de pedidos</h2><span>{orders.length} em aberto · mais recentes primeiro</span></div>
      <div className="orders-list">{orders.length ? orders.map((order) => {
        const [label, action] = nextOrderAction(order);
        const pillClass = order.status === 'payment_pending' ? '' : 'good';
        return <div className="order-row" key={order.id}><div><div className="order-id">{order.id}</div><span className="order-time">{new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></div>
          <div className="order-summary"><strong>{order.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')}</strong><span>{order.regionName} · {order.slotLabel} · {money(order.total)}</span></div>
          <div className="order-controls"><span className={`status-pill ${pillClass}`}>{orderStatusLabel(order)}</span>{action && <button type="button" className="small-button" onClick={() => onOrderAction(order.id, action)}>{label}</button>}{order.status === 'payment_pending' && <button type="button" className="small-button" onClick={() => onOrderAction(order.id, 'fail-payment')}>Simular recusa</button>}</div>
        </div>;
      }) : <div className="empty-state">Nenhum pedido em aberto. Novos pedidos aparecerão aqui.</div>}</div>
    </section>
  );
}

function InventoryPanel({ state, onStockChange }) {
  return (
    <section className="ops-panel"><div className="panel-head"><h2>Estoque de insumos</h2><span>Disponível = físico − reservado</span></div>
      <div className="inventory-list">{Object.entries(ingredients).map(([id, ingredient]) => {
        const onHand = state.inventory[id] || 0;
        const reserved = state.reserved[id] || 0;
        const available = Math.max(0, onHand - reserved);
        const low = available <= 3;
        return <div className="ingredient-row" key={id}><div><strong>{ingredient.name}</strong><small>{low ? 'Reposição necessária' : 'Ficha técnica ativa'}</small></div>
          <div className="ingredient-qty"><b>{available}</b><small>{ingredient.unit}</small></div>
          <div className="stock-controls"><button type="button" onClick={() => onStockChange(id, -1)} aria-label={`Retirar uma porção de ${ingredient.name}`} disabled={onHand <= reserved}>−</button><button type="button" onClick={() => onStockChange(id, 1)} aria-label={`Adicionar uma porção de ${ingredient.name}`}>+</button></div>
        </div>;
      })}</div>
    </section>
  );
}

function Ops({ state, slots, onOrderAction, onStockChange }) {
  const activeOrders = state.orders.filter((order) => !['delivered', 'payment_failed'].includes(order.status));
  const pending = state.orders.filter((order) => order.status === 'payment_pending').length;
  const lowIngredients = Object.keys(ingredients).filter((id) => (state.inventory[id] || 0) - (state.reserved[id] || 0) <= 3).length;
  const delivered = state.orders.filter((order) => order.status === 'delivered');
  const onTime = delivered.length ? `${Math.round(delivered.filter((order) => order.onTime).length / delivered.length * 100)}%` : '—';
  const lastHour = state.orders.filter((order) => order.createdAt >= Date.now() - 60 * 60 * 1000 && order.status !== 'payment_failed').length;

  return (
    <main className="page fade-in"><div className="ops-heading"><div><p className="eyebrow ops-eyebrow">Central de operações</p><h1>Ritmo sob controle.</h1><p>Acompanhe capacidade, pagamentos, pedidos e insumos em um só lugar.</p></div><div className="live-label"><span className="service-dot" />Estado local · atualizado agora</div></div>
      <div className="metric-grid"><article className="metric"><div className="metric-label">Pedidos na última hora</div><div className="metric-value">{lastHour}<span className="metric-unit"> / 40</span></div><div className="metric-detail">Limite conservador inicial</div></article>
        <article className={`metric ${pending ? 'alert' : ''}`}><div className="metric-label">Pagamentos pendentes</div><div className="metric-value">{pending}</div><div className="metric-detail">{pending ? 'Reconciliar antes de nova tentativa' : 'Nenhum pagamento em limbo'}</div></article>
        <article className="metric"><div className="metric-label">Pedidos em fluxo</div><div className="metric-value">{activeOrders.length}</div><div className="metric-detail">Da confirmação até a entrega</div></article>
        <article className={`metric ${lowIngredients ? 'alert' : ''}`}><div className="metric-label">Insumos em atenção</div><div className="metric-value">{lowIngredients}</div><div className="metric-detail">Disponível igual ou abaixo de 3 porções</div></article></div>
      <div className="ops-grid"><div className="ops-column"> <CapacityPanel state={state} slots={slots} /><OrdersPanel state={state} onOrderAction={onOrderAction} /></div><div className="ops-column"><InventoryPanel state={state} onStockChange={onStockChange} />
        <section className="ops-panel"><div className="panel-head"><h2>Qualidade de entrega</h2><span>Meta inicial</span></div><div className="capacity-wrap"><div className="capacity-top"><strong>{onTime}</strong><span>meta ≥95% no prazo</span></div><p className="delivery-note">{delivered.length ? `${delivered.length} entrega(s) registradas nesta demonstração.` : 'Ainda sem entregas registradas. A métrica começa após a primeira confirmação.'}</p></div></section></div></div>
      <div className="ops-note"><span className="ops-note-icon" aria-hidden="true">!</span><p><strong>Modo de demonstração</strong>Pedidos, estoque e capacidade são persistidos neste navegador. Pagamentos, cozinha e entregadores não estão conectados a sistemas reais.</p></div>
      <footer className="footer">PratoCerto · Protótipo operacional local, não um back-office de produção.</footer>
    </main>
  );
}

export default function App() {
  const [state, setState] = useState(loadState);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [toast, setToast] = useState('');
  const slots = nextSlots();
  const slotSignature = slots.map((slot) => slot.key).join('|');
  const region = regions.find((item) => item.id === state.region);
  const availableSlots = slots.filter((slot) => {
    const record = getSlotRecord(state, state.region, slot.key);
    return record.used + record.reserved < region.capacity;
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  useEffect(() => {
    if (!availableSlots.some((slot) => slot.key === selectedSlot)) setSelectedSlot(availableSlots[0]?.key || '');
  }, [state.region, state.slots, selectedSlot, slotSignature]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  function addToCart(id, delta = 1) {
    const product = menu.find((item) => item.id === id);
    if (!product) return;
    const next = (state.cart[id] || 0) + delta;
    if (next > availableFor(state, product)) { setToast('Estoque insuficiente. O cardápio foi atualizado.'); return; }
    setState((previous) => {
      const cart = { ...previous.cart };
      if (next <= 0) delete cart[id]; else cart[id] = next;
      return { ...previous, cart };
    });
  }

  function checkout() {
    const slot = slots.find((item) => item.key === selectedSlot);
    const currentRegion = regions.find((item) => item.id === state.region);
    if (!slot || !currentRegion || !Object.keys(state.cart).length) return;
    const record = getSlotRecord(state, currentRegion.id, slot.key);
    if (record.used + record.reserved >= currentRegion.capacity) { setSelectedSlot(''); setToast('Esse horário acabou de esgotar. Escolha outro slot disponível.'); return; }
    const items = Object.entries(state.cart).map(([id, quantity]) => ({ product: menu.find((item) => item.id === id), quantity }));
    if (items.some(({ product, quantity }) => !product || availableFor(state, product) < quantity)) { setToast('Um item ficou indisponível. Revise seu carrinho antes de continuar.'); return; }
    const recipeTotals = {};
    for (const { product, quantity } of items) for (const [id, amount] of Object.entries(product.recipe)) recipeTotals[id] = (recipeTotals[id] || 0) + amount * quantity;
    const order = {
      id: `PC-${String(Date.now()).slice(-6)}`,
      createdAt: Date.now(), regionId: currentRegion.id, regionName: currentRegion.name,
      slotKey: slot.key, slotLabel: slot.label,
      items: items.map(({ product, quantity }) => ({ id: product.id, name: product.name, quantity })),
      total: items.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0),
      recipeTotals, status: 'payment_pending', reservationReleased: false, onTime: false,
    };
    setState((previous) => {
      const reserved = { ...previous.reserved };
      for (const [id, amount] of Object.entries(recipeTotals)) reserved[id] = (reserved[id] || 0) + amount;
      const slotsState = { ...previous.slots };
      const slotId = `${currentRegion.id}|${slot.key}`;
      const currentSlot = slotsState[slotId] || { used: 0, reserved: 0 };
      slotsState[slotId] = { ...currentSlot, reserved: currentSlot.reserved + 1 };
      return { ...previous, reserved, slots: slotsState, orders: [order, ...previous.orders], cart: {} };
    });
    setToast('Pedido criado. Aguardando confirmação do pagamento. Não tente pagar novamente.');
  }

  function updateOrder(orderId, action) {
    if (action === 'reconcile') { setToast('A tentativa continua pendente. Nenhuma nova cobrança ou aprovação foi criada.'); return; }
    setState((previous) => {
      const order = previous.orders.find((item) => item.id === orderId);
      if (!order) return previous;
      const next = { ...previous, orders: previous.orders.map((item) => ({ ...item })), inventory: { ...previous.inventory }, reserved: { ...previous.reserved }, slots: { ...previous.slots } };
      const updated = next.orders.find((item) => item.id === orderId);
      const transitions = {
        'confirm-payment': 'confirmed', 'fail-payment': 'payment_failed', 'start-prep': 'preparing',
        'mark-ready': 'ready', 'start-delivery': 'delivering', deliver: 'delivered',
      };
      const allowed = {
        'confirm-payment': 'payment_pending', 'fail-payment': 'payment_pending', 'start-prep': 'confirmed',
        'mark-ready': 'preparing', 'start-delivery': 'ready', deliver: 'delivering',
      };
      if (updated.status !== allowed[action]) return previous;
      if (action === 'confirm-payment' || action === 'fail-payment') {
        if (!updated.reservationReleased) {
          for (const [id, amount] of Object.entries(updated.recipeTotals)) {
            next.reserved[id] = Math.max(0, (next.reserved[id] || 0) - amount);
            if (action === 'confirm-payment') next.inventory[id] = Math.max(0, (next.inventory[id] || 0) - amount);
          }
          const slotId = `${updated.regionId}|${updated.slotKey}`;
          const slotRecord = next.slots[slotId] || { used: 0, reserved: 0 };
          next.slots[slotId] = { ...slotRecord, reserved: Math.max(0, slotRecord.reserved - 1), used: slotRecord.used + (action === 'confirm-payment' ? 1 : 0) };
          updated.reservationReleased = true;
        }
      }
      updated.status = transitions[action];
      if (action === 'deliver') { updated.onTime = true; updated.deliveredAt = Date.now(); }
      return next;
    });
    if (action === 'confirm-payment') setToast('Aprovação simulada registrada.');
  }

  function changeStock(id, delta) {
    setState((previous) => {
      const current = previous.inventory[id] || 0;
      const minimum = previous.reserved[id] || 0;
      if (delta < 0 && current <= minimum) return previous;
      return { ...previous, inventory: { ...previous.inventory, [id]: Math.max(minimum, current + delta) } };
    });
  }

  return (
    <>
      <Header view={state.view} onChangeView={(view) => setState((previous) => ({ ...previous, view }))} />
      {state.view === 'shop'
        ? <Shop state={state} slots={slots} selectedSlot={selectedSlot} onCategoryChange={(category) => setState((previous) => ({ ...previous, category }))} onRegionChange={(value) => { setSelectedSlot(''); setState((previous) => ({ ...previous, region: value })); }} onSelectSlot={setSelectedSlot} onAdd={addToCart} onQuantityChange={addToCart} onCheckout={checkout} onCheckPayment={(id) => updateOrder(id, 'reconcile')} />
        : <Ops state={state} slots={slots} onOrderAction={updateOrder} onStockChange={changeStock} />}
      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">{toast}</div>
    </>
  );
}