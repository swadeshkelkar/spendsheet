// Temporary preview to check the theme colors. Step 3 replaces this.
function App() {
  return (
    <main
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: 24,
        display: "grid",
        gap: 16,
      }}
    >
      <h1>Spendsheet</h1>
      <p className='muted'>Secondary text uses --text-2.</p>
      <div className='card'>
        <p style={{ marginTop: 0 }}>
          This card uses --surface and --border. <a href='#'>This is a link.</a>
        </p>
        <button className='btn-primary'>Save expense</button>
      </div>
    </main>
  );
}

export default App;
