import React, { useState, useEffect } from 'react';
import { Calendar, ExternalLink, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import Sidebar from '../components/Sidebar';

const News = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = async () => {
    try {
      setError(null);
      // Using NewsAPI's free tier with Indianapolis search
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=Indianapolis&sortBy=publishedAt&pageSize=20&apiKey=`
      );
      
      if (!response.ok) {
        // Fallback to mock data if API fails
        const mockNews = [
          {
            title: "Indianapolis Colts Announce New Stadium Renovations",
            description: "The Indianapolis Colts have unveiled plans for a major renovation of Lucas Oil Stadium, featuring new technology and fan amenities.",
            url: "https://example.com/colts-renovation",
            urlToImage: "https://images.unsplash.com/photo-1566577134770-3d85bb3a9cc4?w=400&h=250&fit=crop",
            publishedAt: new Date().toISOString(),
            source: { name: "Indianapolis Star" }
          },
          {
            title: "Downtown Indianapolis Development Project Breaks Ground",
            description: "A new mixed-use development in downtown Indianapolis officially broke ground today, promising to bring hundreds of new jobs to the area.",
            url: "https://example.com/downtown-development",
            urlToImage: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=250&fit=crop",
            publishedAt: new Date(Date.now() - 3600000).toISOString(),
            source: { name: "WTHR" }
          },
          {
            title: "Indianapolis Public Library Expands Digital Services",
            description: "The Indianapolis Public Library system announces major expansion of digital resources and virtual programming for residents.",
            url: "https://example.com/library-digital",
            urlToImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=250&fit=crop",
            publishedAt: new Date(Date.now() - 7200000).toISOString(),
            source: { name: "Indianapolis Business Journal" }
          },
          {
            title: "Indiana State Fair Announces 2025 Lineup",
            description: "The Indiana State Fair has revealed its entertainment lineup for 2025, featuring major musical acts and new attractions.",
            url: "https://example.com/state-fair",
            urlToImage: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=250&fit=crop",
            publishedAt: new Date(Date.now() - 10800000).toISOString(),
            source: { name: "Fox59" }
          },
          {
            title: "Indianapolis Weather: Severe Storm Warning Issued",
            description: "The National Weather Service has issued a severe thunderstorm warning for the Indianapolis metropolitan area.",
            url: "https://example.com/weather-warning",
            urlToImage: "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=400&h=250&fit=crop",
            publishedAt: new Date(Date.now() - 14400000).toISOString(),
            source: { name: "WRTV" }
          }
        ];
        setNews(mockNews);
        return;
      }
      
      const data = await response.json();
      setNews(data.articles || []);
    } catch (err) {
      setError('Failed to load news. Please try again later.');
      console.error('News fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNews();
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const publishedDate = new Date(dateString);
    const diffInHours = Math.floor((now - publishedDate) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours === 1) return '1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1 day ago';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return publishedDate.toLocaleDateString();
  };

  const handleImageError = (e) => {
    e.target.style.display = 'none';
  };

  return (
    <div style={{display:'flex', flexDirection:'row', maxHeight:'100vh'}}>
        <Sidebar/>
    <div style={{maxHeight:'100vh', overflowY:'scroll', margin:'auto'}} className="news-container">
      <div className="news-header">
        <div className="news-title-section">
          <h1 className="news-title">Indianapolis News</h1>
          <div className="news-subtitle">Latest updates from the Circle City</div>
        </div>
        <button 
          className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading Indianapolis news...</p>
        </div>
      )}

      {error && (
        <div className="error-container">
          <AlertCircle size={24} />
          <p className="error-text">{error}</p>
          <button className="retry-btn" onClick={handleRefresh}>
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="news-grid">
          {news.length === 0 ? (
            <div className="no-news">
              <p>No news articles found.</p>
            </div>
          ) : (
            news.map((article, index) => (
              <article key={index} className="news-card">
                {article.urlToImage && (
                  <div className="news-image-container">
                    <img
                      src={article.urlToImage}
                      alt={article.title}
                      className="news-image"
                      onError={handleImageError}
                    />
                  </div>
                )}
                
                <div className="news-content">
                  <div className="news-meta">
                    <span className="news-source">{article.source?.name}</span>
                    <div className="news-time">
                      <Clock size={12} />
                      <span>{formatTimeAgo(article.publishedAt)}</span>
                    </div>
                  </div>
                  
                  <h2 className="news-headline">{article.title}</h2>
                  
                  {article.description && (
                    <p className="news-description">{article.description}</p>
                  )}
                  
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="news-link"
                  >
                    Read more
                    <ExternalLink size={14} />
                  </a>
                </div>
              </article>
            ))
          )}
        </div>
            
      )}

      <style jsx>{`
        .news-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background-color: #000000;
          color: #ffffff;
          font-family: inherit;
        }

        .news-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 40px 20px;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          border-bottom: 1px solid #1a1a1a;
        }

        .news-title-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .news-title {
          font-size: 32px;
          font-weight: 600;
          letter-spacing: -1px;
          margin: 0;
          color: #ffffffdd;
        }

        .news-subtitle {
          background-color: #01ddff31;
          color: #01a9c2;
          width: fit-content;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
        }

        .refresh-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background-color: #242424c6;
          border: 1px solid #2a2a2a;
          color: #ffffffa1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .refresh-btn:hover:not(:disabled) {
          background-color: #2a2a2a;
          color: #01a9c2;
          transform: translateY(-1px);
        }

        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .refreshing svg {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          gap: 16px;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 2px solid #2a2a2a;
          border-top: 2px solid #01a9c2;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .loading-text {
          color: #666666;
          font-size: 16px;
          margin: 0;
        }

        .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          gap: 16px;
          color: #ff6b6b;
        }

        .error-text {
          font-size: 16px;
          margin: 0;
          text-align: center;
        }

        .retry-btn {
          background-color: #242424c6;
          border: 1px solid #2a2a2a;
          color: #ffffff;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .retry-btn:hover {
          background-color: #2a2a2a;
          color: #01a9c2;
        }

        .news-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 24px;
          padding: 40px 20px;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .news-card {
          background-color: #0a0a0a;
          border: 1px solid #1a1a1a;
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: cardSlide 0.6s ease-out;
        }

        .news-card:hover {
          transform: translateY(-2px);
          border-color: #2a2a2a;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        @keyframes cardSlide {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .news-image-container {
          position: relative;
          width: 100%;
          height: 200px;
          overflow: hidden;
        }

        .news-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .news-card:hover .news-image {
          transform: scale(1.05);
        }

        .news-content {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .news-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: #666666;
        }

        .news-source {
          background-color: #1a1a1a;
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: 500;
          color: #01a9c2;
        }

        .news-time {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .news-headline {
          font-size: 18px;
          font-weight: 600;
          line-height: 1.4;
          margin: 0;
          color: #ffffffdd;
        }

        .news-description {
          font-size: 14px;
          line-height: 1.5;
          color: #cccccc;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .news-link {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #01a9c2;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          align-self: flex-start;
        }

        .news-link:hover {
          color: #01ddff;
          transform: translateX(2px);
        }

        .no-news {
          grid-column: 1 / -1;
          text-align: center;
          padding: 80px 20px;
          color: #666666;
        }

        @media (max-width: 768px) {
          .news-header {
            padding: 20px 16px;
            flex-direction: column;
            gap: 16px;
            align-items: flex-start;
          }

          .news-title {
            font-size: 28px;
          }

          .news-grid {
            grid-template-columns: 1fr;
            gap: 16px;
            padding: 20px 16px;
          }

          .news-card {
            border-radius: 12px;
          }

          .news-content {
            padding: 16px;
          }

          .news-headline {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
    </div>

  );
};

export default News;