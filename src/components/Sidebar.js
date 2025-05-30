import React, { useState, useRef, useEffect } from 'react';
import { Plus, Send, Paperclip, X, File, Image, DiamondPlus, UserPen, TriangleAlert , Globe} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import '../pages/styles/home.css';


export default function Sidebar() {
    const [showTooltip, setShowTooltip] = useState(false);
    const [hoveredIcon, setHoveredIcon] = useState(null);

    const navigate = useNavigate();

    const sidebarIcons = [
      { icon: DiamondPlus, name: 'Ask', id: 'new', link:'/home' },
      { icon: Globe, name: 'Local News', id: 'globe', link:'/news' },
      { icon: TriangleAlert, name: 'Alerts', id: 'alert', link:'/alerts' },
     
    ];
  
    
  return (
    <>
    


    <div className="sidebar">
        {sidebarIcons.map(({ icon: Icon, name, id, link }) => (
          <Link to={`${link}`} key={id}>
            <div onClick={()=>{
              sessionStorage.removeItem('chatMessages');
              sessionStorage.removeItem('chatLoadedFromStorage');
            }}
              className="sidebar-icon"
              onMouseEnter={() => setHoveredIcon(id)}
              onMouseLeave={() => setHoveredIcon(null)}
            >
              <Icon size={20} />
              <div className={`tooltip ${hoveredIcon === id ? 'tooltip-visible' : ''}`}>
                {name}
              </div>
            </div>
          </Link>
        ))}
      </div>

  
  {/* <footer className="wizz-footer">
            <span className="footer-link">Built to understand. Trained to feel.</span>
         
        </footer> */}
        </>
  )
}
