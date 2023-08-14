import styles from './page.module.scss'

export default function Home() {
  return (
    <div className="global">
        <BrowserRouter>
          <header>
            <Navbar />
          </header>
          <div className="container">
            <Routes>
              <Route exact path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </div>
        </BrowserRouter>

      <div className="home-background">
        {document && (
          <PrismicImage field={document.data.image} />
        )}
      </div>
    </div>
  )
}
