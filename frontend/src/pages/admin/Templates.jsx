import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

export default function AdminTemplates() {
  const [oaFilter, setOaFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: oaConfigs } = useQuery({
    queryKey: ['admin-oa-configs-select'],
    queryFn: () => api.get('/admin/oa-configs', { params: { limit: 100 } }).then(r => r.data.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-templates', oaFilter, page],
    queryFn: () => api.get('/admin/templates', { params: { oaConfigId: oaFilter || undefined, page, limit: 20 } }).then(r => r.data),
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header-title">Mẫu tin nhắn</h1>
        <p className="page-header-desc">Danh sách mẫu tin ZNS đã duyệt và đồng bộ từ Zalo</p>
      </div>

      <div className="card">
        <div className="toolbar" style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}>
          <select className="filter-select" value={oaFilter} onChange={e => { setOaFilter(e.target.value); setPage(1); }}>
            <option value="">Tất cả OA</option>
            {oaConfigs?.map(oa => <option key={oa.id} value={oa.id}>{oa.oaName}</option>)}
          </select>
        </div>
        {isLoading ? <div className="loading-overlay"><div className="spinner" /></div> : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Template ID</th><th>Tên mẫu tin</th><th>OA</th><th>Loại</th><th>Chất lượng</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {data?.data?.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontFamily: 'monospace' }}>{t.templateId}</td>
                      <td className="table-cell-bold">{t.templateName}</td>
                      <td>{t.fptOaConfig?.oaName}</td>
                      <td><span className="badge badge-neutral">{t.templateTag || '—'}</span></td>
                      <td><span className={`badge ${t.templateQuality === 'HIGH' ? 'badge-success' : t.templateQuality === 'LOW' ? 'badge-danger' : 'badge-warning'}`}>{t.templateQuality || 'N/A'}</span></td>
                      <td><span className={`badge ${t.status === 'ENABLE' ? 'badge-success' : t.status === 'PENDING' ? 'badge-warning' : 'badge-danger'}`}>{t.status === 'ENABLE' ? 'Kích hoạt' : t.status === 'PENDING' ? 'Chờ duyệt' : 'Bị khoá'}</span></td>
                    </tr>
                  ))}
                  {!data?.data?.length && <tr><td colSpan={6} className="empty-state"><div className="empty-state-title">Chưa có mẫu tin</div></td></tr>}
                </tbody>
              </table>
            </div>
            {data?.totalPages > 1 && (
              <div className="pagination">
                <div className="pagination-info">Trang {page} trên {data.totalPages} ({data.total} mẫu tin)</div>
                <div className="pagination-controls">
                  <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</button>
                  <button className="pagination-btn" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}>Sau</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
