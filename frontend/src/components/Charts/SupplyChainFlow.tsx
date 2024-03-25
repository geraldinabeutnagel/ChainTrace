import React from 'react';
import { ResponsiveContainer, Sankey, Tooltip, Cell } from 'recharts';

interface SupplyChainNode {
  name: string;
  category: string;
  status: 'completed' | 'in-progress' | 'pending' | 'error';
  timestamp?: string;
  metadata?: Record<string, any>;
}

interface SupplyChainLink {
  source: string;
  target: string;
  value: number;
  status: 'active' | 'completed' | 'error';
  duration?: number;
}

interface SupplyChainFlowProps {
  nodes: SupplyChainNode[];
  links: SupplyChainLink[];
  title?: string;
  height?: number;
  showTimestamps?: boolean;
}

export const SupplyChainFlow: React.FC<SupplyChainFlowProps> = ({
  nodes,
  links,
  title = "Supply Chain Flow",
  height = 500,
  showTimestamps = true
}) => {
  // Transform data for Sankey chart
  const sankeyData = {
    nodes: nodes.map(node => ({
      name: node.name,
      category: node.category,
      status: node.status
    })),
    links: links.map(link => ({
      source: link.source,
      target: link.target,
      value: link.value,
      status: link.status
    }))
  };

  // Color scheme for different statuses
  const getNodeColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'in-progress': return '#FF9800';
      case 'pending': return '#9E9E9E';
      case 'error': return '#F44336';
      default: return '#2196F3';
    }
  };

  const getLinkColor = (status: string) => {
    switch (status) {
      case 'active': return '#2196F3';
      case 'completed': return '#4CAF50';
      case 'error': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  return (
    <div className="supply-chain-flow">
      <h3 className="chart-title">{title}</h3>
      
      {/* Legend */}
      <div className="legend">
        <div className="legend-item">
          <span className="legend-color completed"></span>
          <span>Completed</span>
        </div>
        <div className="legend-item">
          <span className="legend-color in-progress"></span>
          <span>In Progress</span>
        </div>
        <div className="legend-item">
          <span className="legend-color pending"></span>
          <span>Pending</span>
        </div>
        <div className="legend-item">
          <span className="legend-color error"></span>
          <span>Error</span>
        </div>
      </div>

      {/* Sankey Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <Sankey
          data={sankeyData}
          nodeWidth={20}
          nodePadding={50}
          linkCurvature={0.5}
          iterations={32}
        >
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length > 0) {
                const data = payload[0].payload;
                return (
                  <div className="custom-tooltip">
                    <p className="tooltip-label">{data.name}</p>
                    <p className="tooltip-value">Value: {data.value}</p>
                    {data.status && (
                      <p className="tooltip-status">Status: {data.status}</p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
        </Sankey>
      </ResponsiveContainer>

      {/* Node Details */}
      {showTimestamps && (
        <div className="node-details">
          <h4>Node Details</h4>
          <div className="details-grid">
            {nodes.map((node, index) => (
              <div key={index} className="detail-item">
                <div className="detail-header">
                  <span className="node-name">{node.name}</span>
                  <span className={`status-badge ${node.status}`}>
                    {node.status}
                  </span>
                </div>
                <div className="detail-body">
                  <p>Category: {node.category}</p>
                  {node.timestamp && (
                    <p>Time: {new Date(node.timestamp).toLocaleString()}</p>
                  )}
                  {node.metadata && Object.keys(node.metadata).length > 0 && (
                    <div className="metadata">
                      <p>Metadata:</p>
                      <ul>
                        {Object.entries(node.metadata).map(([key, value]) => (
                          <li key={key}>{key}: {String(value)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .supply-chain-flow {
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .chart-title {
          margin-bottom: 20px;
          color: #333;
          font-size: 1.5em;
        }

        .legend {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: 50%;
        }

        .legend-color.completed { background-color: #4CAF50; }
        .legend-color.in-progress { background-color: #FF9800; }
        .legend-color.pending { background-color: #9E9E9E; }
        .legend-color.error { background-color: #F44336; }

        .node-details {
          margin-top: 30px;
        }

        .node-details h4 {
          margin-bottom: 15px;
          color: #333;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 15px;
        }

        .detail-item {
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 15px;
          background: #f9f9f9;
        }

        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .node-name {
          font-weight: bold;
          color: #333;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8em;
          text-transform: uppercase;
          color: white;
        }

        .status-badge.completed { background-color: #4CAF50; }
        .status-badge.in-progress { background-color: #FF9800; }
        .status-badge.pending { background-color: #9E9E9E; }
        .status-badge.error { background-color: #F44336; }

        .detail-body p {
          margin: 5px 0;
          color: #666;
        }

        .metadata {
          margin-top: 10px;
        }

        .metadata ul {
          margin: 5px 0;
          padding-left: 20px;
        }

        .metadata li {
          margin: 2px 0;
          color: #666;
        }

        .custom-tooltip {
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 10px;
          border-radius: 4px;
          font-size: 12px;
        }

        .tooltip-label {
          font-weight: bold;
          margin-bottom: 5px;
        }

        .tooltip-value, .tooltip-status {
          margin: 2px 0;
        }
      `}</style>
    </div>
  );
};

export default SupplyChainFlow;
