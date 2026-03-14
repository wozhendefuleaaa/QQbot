import { ReactNode } from 'react';

interface SkeletonProps {
  className?: string;
  children?: ReactNode;
}

// 基础骨架屏组件
export function Skeleton({ className = '', children }: SkeletonProps) {
  return <div className={`skeleton ${className}`}>{children}</div>;
}

// 文本骨架屏
export function SkeletonText({ 
  width = '100%', 
  lines = 1,
  className = '' 
}: { 
  width?: string; 
  lines?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className="skeleton skeleton-text" 
          style={{ 
            width: i === lines - 1 && lines > 1 ? '70%' : width,
            height: '14px',
            marginBottom: i < lines - 1 ? '8px' : 0
          }} 
        />
      ))}
    </div>
  );
}

// 头像骨架屏
export function SkeletonAvatar({ size = 44, className = '' }: { size?: number; className?: string }) {
  return (
    <div 
      className={`skeleton skeleton-avatar ${className}`} 
      style={{ width: size, height: size }}
    />
  );
}

// 按钮骨架屏
export function SkeletonButton({ width = 100, height = 36, className = '' }: { width?: number; height?: number; className?: string }) {
  return (
    <div 
      className={`skeleton skeleton-button ${className}`} 
      style={{ width, height }}
    />
  );
}

// 面板骨架屏
export function SkeletonPanel({ className = '' }: { className?: string }) {
  return (
    <div className={`panel skeleton-panel ${className}`}>
      <SkeletonText width="40%" lines={1} />
      <div style={{ marginTop: '16px' }}>
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </div>
  );
}

// 行骨架屏
export function SkeletonRow({ className = '' }: { className?: string }) {
  return (
    <div className={`skeleton-row ${className}`}>
      <SkeletonAvatar size={36} />
      <div style={{ flex: 1 }}>
        <SkeletonText width="60%" lines={1} />
        <SkeletonText width="40%" lines={1} />
      </div>
      <SkeletonButton width={60} height={28} />
    </div>
  );
}

// 会话列表骨架屏
export function SkeletonConversationList({ count = 5 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="conv-item" style={{ cursor: 'default' }}>
          <SkeletonAvatar size={44} />
          <div className="conv-content" style={{ flex: 1 }}>
            <div className="conv-title-row">
              <SkeletonText width="60%" lines={1} />
            </div>
            <SkeletonText width="80%" lines={1} />
          </div>
        </div>
      ))}
    </div>
  );
}

// 消息骨架屏
export function SkeletonMessages({ count = 5 }: { count?: number }) {
  return (
    <div className="msg-list">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className={`msg-bubble ${i % 2 === 0 ? 'inbound' : 'outbound'}`}
          style={{ 
            maxWidth: '70%',
            alignSelf: i % 2 === 0 ? 'flex-start' : 'flex-end'
          }}
        >
          <SkeletonText width="200px" lines={2} />
        </div>
      ))}
    </div>
  );
}

// 统计卡片骨架屏
export function SkeletonStatCard() {
  return (
    <div className="stat-card">
      <SkeletonText width="50%" lines={1} />
      <div style={{ fontSize: '24px', marginTop: '8px' }}>
        <SkeletonText width="30%" lines={1} />
      </div>
    </div>
  );
}

// 日志骨架屏
export function SkeletonLogs({ count = 5 }: { count?: number }) {
  return (
    <div className="logbox">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="log-item">
          <SkeletonText width="60px" lines={1} />
          <SkeletonText width="150px" lines={1} />
          <SkeletonText width="100%" lines={1} />
        </div>
      ))}
    </div>
  );
}
