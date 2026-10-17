import { HashRouter } from "react-router-dom"
import AppRoutes from "./routes"
import { PermissionProvider } from "./contexts/PermissionContext"

function App() {
  return (
    <HashRouter>
      <PermissionProvider>
        <AppRoutes />
      </PermissionProvider>
    </HashRouter>
  )
}

export default App
