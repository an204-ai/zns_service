import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import Pagination from '../../components/Pagination';
import TemplateDetailModal from '../../components/TemplateDetailModal';
import { CaretRight } from '@phosphor-icons/react';

import CustomSelect from '../../components/CustomSelect';

export default function AdminTemplates() {
  const [oaFilter, setOaFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const { data: oaConfigs } = useQuery({
    queryKey: ['admin-oa-configs-select'],
    queryFn: () => api.get('/admin/oa-configs', { params: { limit: 100 } }).then(r => r.data.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-templates', oaFilter, page, limit],
    queryFn: () => api.get('/admin/templates', { params: { oaConfigId: oaFilter || undefined, page, limit } }).then(r => r.data),
  });

  return (
    <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
      <div className="console-section-header">
        <h1 className="console-section-title">Mẫu tin nhắn</h1>
        <p className="console-section-desc">Danh sách mẫu tin ZNS đã duyệt và đồng bộ từ Zalo</p>
      </div>

      <div className="console-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
        <div className="console-toolbar-left" style={{ width: 250 }}>
          <CustomSelect
            value={oaFilter}
            onChange={val => { setOaFilter(val); setPage(1); }}
            placeholder="Tất cả ứng dụng liên kết"
            options={[
              { value: '', label: 'Tất cả ứng dụng liên kết' },
              ...(oaConfigs || []).map(oa => ({
                value: oa.id,
                label: oa.oaName,
                sublabel: oa.isSystem ? 'Ứng dụng hệ thống' : 'Ứng dụng cá nhân',
              })),
            ]}
          />
        </div>
      </div>

      <div className="console-card-table">
        {isLoading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 44, textAlign: 'center' }}>#</th>
                    <th style={{ width: '15%', textAlign: 'left' }}>Mã mẫu tin</th>
                    <th style={{ width: '22%', textAlign: 'left' }}>Tên mẫu tin</th>
                    <th style={{ width: '18%', textAlign: 'left' }}>Ứng dụng liên kết</th>
                    <th style={{ width: '15%', textAlign: 'center' }}>Phân loại</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Chất lượng</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ width: '10%', textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.map((t, idx) => (
                    <tr
                      key={t.id}
                      className="clickable-row"
                      onClick={() => setSelectedTemplate(t)}
                    >
                      <td className="table-col-index">{(page - 1) * limit + idx + 1}</td>
                      <td style={{ fontFamily: 'monospace', color: '#2563eb', fontWeight: 600 }}>
                        {t.templateId}
                      </td>
                      <td className="table-cell-bold">{t.templateName}</td>
                      <td style={{ fontSize: 12.5, color: '#475569' }}>{t.fptAppConfig?.oaName}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                          {t.templateTag || 'Chăm sóc khách hàng'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${t.templateQuality === 'HIGH' ? 'badge-success' : t.templateQuality === 'LOW' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: 11 }}>
                          {t.templateQuality === 'HIGH' ? 'Tốt' : t.templateQuality === 'LOW' ? 'Kém' : 'Trung bình'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {t.status === 'ENABLE' ? (
                          <span className="badge-active-pill">Kích hoạt</span>
                        ) : t.status === 'PENDING' ? (
                          <span className="badge badge-warning" style={{ fontSize: 11 }}>Chờ duyệt</span>
                        ) : (
                          <span className="badge-inactive-pill">Đã khoá</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          style={{ fontSize: 12, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTemplate(t);
                          }}
                        >
                          Chi tiết
                          <CaretRight size={13} weight="bold" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!data?.data?.length && (
                    <tr>
                      <td colSpan={8} className="empty-state" style={{ padding: '36px 20px', textAlign: 'center' }}>
                        <div className="empty-state-title" style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>
                          Chưa có mẫu tin nào
                        </div>
                        <p style={{ color: '#64748b', fontSize: 12.5, marginTop: 4 }}>
                          Chọn ứng dụng khác hoặc đồng bộ mẫu tin từ quản lý ứng dụng
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={page}
              totalPages={data?.totalPages || 1}
              pageSize={limit}
              totalItems={data?.total}
              onPageChange={setPage}
              onPageSizeChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
            />
          </>
        )}
      </div>

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <TemplateDetailModal
          isOpen={!!selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          templateId={selectedTemplate.templateId}
          oaId={selectedTemplate.fptAppConfigId || selectedTemplate.fptAppConfig?.id}
          initialData={selectedTemplate}
          isAdmin={true}
        />
      )}
    </div>
  );
}
