import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import Navbar from './Navbar';
import 'bootstrap/dist/css/bootstrap.min.css';
import SignUp from './UIElements/authentication/SignUp'
import ForgotPassword from './UIElements/authentication/ForgotPassword';
import ValidateCode from './UIElements/authentication/ValidateCode';
import SignIn from './UIElements/authentication/SignIn';
import EnvelopeGroupsList from './UIElements/Envelopgroup/EnvelopeGroupsList';
import VerifyEmail from './UIElements/authentication/VerifyEmail';
import EnvelopesList from './UIElements/Envelopes/EnvelopesList';
import ClientList from './UIElements/Client/ClientList';
import UpdatePassword from './UIElements/Settings/UpdatePassword';
import Profile from './UIElements/Settings/Profile';
import Settings from './UIElements/Settings/Setting';
import IndiciaList from './UIElements/Indicia/IndiciaList';
import { useCustomContext } from "./UIElements/CustomComponents/CustomComponents";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [username, setUsername] = useState('');
  const [showIconsOnly, setShowIconsOnly] = useState(false);
  const location = useLocation();
  const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
  const { showAlert } = useCustomContext();
  const navigate = useNavigate();

  const inactivityTimerRef = useRef(null);

  useEffect(() => {
    const noSelectElements = document.querySelectorAll('.App');
    noSelectElements.forEach((element) => {
      element.style.webkitUserSelect = 'none';
      element.style.mozUserSelect = 'none';
      element.style.msUserSelect = 'none';
      element.style.userSelect = 'none';
    });

    // Check remembered login status but don't reset isLoggedIn automatically
    if (!isLoggedIn && localStorage.getItem('rememberMe') === 'true') {
      const rememberedEmail = localStorage.getItem('rememberedEmail');
      const rememberedPassword = localStorage.getItem('rememberedPassword');

      if (rememberedEmail && rememberedPassword) {
        setUsername(rememberedEmail);
      }
    }
  }, [location.pathname, isLoggedIn]);

  const InspectView = process.env.REACT_APP_INSPECT_VIEW === "false";
  console.log("inspect", InspectView);

  // useEffect(() => {
  //   if (InspectView) {
  //     const handleContextMenu = (e) => {
  //       e.preventDefault();
  //     };

  //     const ctrlShiftKey = (e, keyCode) => {
  //       return e.ctrlKey && e.shiftKey && e.keyCode === keyCode.charCodeAt(0);
  //     };

  //     const cmdOptionKey = (e, keyCode) => {
  //       return e.metaKey && e.altKey && e.keyCode === keyCode.charCodeAt(0);
  //     };

  //     const handleKeyDown = (e) => {
  //       if (
  //         e.keyCode === 123 ||
  //         ctrlShiftKey(e, "I") ||
  //         ctrlShiftKey(e, "J") ||
  //         ctrlShiftKey(e, "C") ||
  //         (e.ctrlKey && e.keyCode === "U".charCodeAt(0)) ||
  //         cmdOptionKey(e, "I") ||
  //         cmdOptionKey(e, "C")||
  //         e.keyCode === 'Escape' ||
  //         e.keyCode === 122
  //       ) {
  //         e.preventDefault();
  //         return false;
  //       }
  //     };

  //     document.addEventListener("contextmenu", handleContextMenu);
  //     document.addEventListener("keydown", handleKeyDown);

  //     return () => {
  //       document.removeEventListener("contextmenu", handleContextMenu);
  //       document.removeEventListener("keydown", handleKeyDown);
  //     };
  //   }
  // }, [InspectView]);





  // logout/cleanup logic
  const handleSignout = () => {
    setIsLoggedIn(false);
    setUsername('');

    if (localStorage.getItem('rememberMe') !== 'true') {
      localStorage.clear();
    } else {
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('accessLevel');
    }

    // notify other tabs
    try {
      localStorage.setItem('app-signout', Date.now().toString());
    } catch (e) {
      // ignore
    }

    // Navigate to login
    navigate('/');
  };

  // helper: clear inactivity timer
  const clearInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  };

  // reset the 15-minute inactivity timer
  const resetInactivityTimer = () => {
    clearInactivityTimer();
    inactivityTimerRef.current = setTimeout(() => {
      try {
        navigate('/', { replace: true });
        handleSignout();
        setTimeout(() => {
          showAlert('Your session has expired due to inactivity. You have been signed out.', [
            {
              label: 'OK',
              onClick: () => {
                // console.log('User cancelled logout');
              },
              color: 'var(--buttonColor)', // Set button color
            }
          ]);
          // window.alert('Your session has expired due to inactivity. You have been signed out.');
        }, 300);
      } catch (e) {
        console.error('Error during auto logout:', e);
      }
    }, INACTIVITY_TIMEOUT);
  };

  const handleLogin = (usernameArg) => {
    setIsLoggedIn(true);
    setShowIconsOnly(false);
    setUsername(usernameArg);
    localStorage.setItem('isLoggedIn', 'true');
    resetInactivityTimer();
  };
  useEffect(() => {
    if (!isLoggedIn) {
      clearInactivityTimer();
      return;
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    const activityHandler = () => {
      resetInactivityTimer();
    };

    events.forEach((ev) => window.addEventListener(ev, activityHandler, { passive: true }));

    // start timer immediately when logged in
    resetInactivityTimer();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, activityHandler));
      clearInactivityTimer();
    };
  }, [isLoggedIn]);


  useEffect(() => {
    const storageHandler = (e) => {
      if (!e) return;
      if (e.key === 'app-signout') {
        // someone signed out in another tab
        setIsLoggedIn(false);
        clearInactivityTimer();
        navigate('/');
      }
    };

    window.addEventListener('storage', storageHandler);
    return () => window.removeEventListener('storage', storageHandler);
  }, [navigate]);



  return (
    <div className={`App ${isLoggedIn ? 'logged-in' : ''}`}>
      {isLoggedIn && <Navbar username={username} showIconsOnly={showIconsOnly} setShowIconsOnly={setShowIconsOnly} onSignout={handleSignout} />}

      <Routes>

        {/* <Route path="/" element={<SignIn onLogin={handleLogin} />} /> */}
        <Route path="/" element={isLoggedIn ? <Navigate to="/EnvelopeGroups" /> : <SignIn onLogin={handleLogin} />} />
        <Route path="/SignUp" element={isLoggedIn ? <Navigate to="/EnvelopeGroups" /> : <SignUp />} />
        <Route path="/ForgotPassword" element={isLoggedIn ? <Navigate to="/EnvelopeGroups" /> : <ForgotPassword />} />
        <Route path="/ValidateCode" element={isLoggedIn ? <Navigate to="/EnvelopeGroups" /> : <ValidateCode />} />
        <Route path="/VerifyEmail" element={isLoggedIn ? <Navigate to="/EnvelopeGroups" /> : <VerifyEmail />} />


        {isLoggedIn && <Route path="/Envelopes" element={<EnvelopesList showIconsOnly={showIconsOnly} />} />}
        {isLoggedIn && <Route path="/EnvelopeGroups" element={<EnvelopeGroupsList showIconsOnly={showIconsOnly} />} />}
        {isLoggedIn && <Route path="/Client" element={<ClientList showIconsOnly={showIconsOnly} />} />}
        {isLoggedIn && <Route path="/Indicia" element={<IndiciaList showIconsOnly={showIconsOnly} />} />}
        {isLoggedIn && (
          <Route path="/Settings" element={<Settings showIconsOnly={showIconsOnly} />}>
            <Route path="Profile" element={<Profile showIconsOnly={showIconsOnly} />} />
            <Route path="UpdatePassword" element={<UpdatePassword showIconsOnly={showIconsOnly} />} />
          </Route>
        )}
        <Route
          path="*"
          element={isLoggedIn ? <Navigate to="/EnvelopeGroups" /> : <Navigate to="/" />}
        />
      </Routes>

    </div>
  );
}

export default App;
