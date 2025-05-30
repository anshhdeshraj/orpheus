import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import OnboardingWrapper from './pages/Onboarding';
import Chat from './pages/Chat';
import News from './pages/News';
import Alerts from './pages/Alerts';
import Profile from './pages/Profile';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<OnboardingWrapper />} />
        <Route path="/home" element={<Home />} />
        <Route path='/chat' element={<Chat />} />
        <Route path='/news' element={<News />} />
        <Route path='/alerts' element={<Alerts />} />
        <Route path='/profile' element={<Profile />} />
      </Routes>
    </Router>
  );
};

export default App;