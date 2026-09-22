export default function CustomerApiDocs() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-header-title">Tài liệu API</h1>
        <p className="page-header-desc">Hướng dẫn kết nối và gửi tin nhắn ZNS từ phần mềm ngoài</p>
      </div>

      <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
        <div className="card-header"><div className="card-header-title">Xác thực</div></div>
        <div className="card-body">
          <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Tất cả API yêu cầu header <code style={{ background: 'var(--color-gray-100)', padding: '2px 6px', borderRadius: 4 }}>x-api-key</code> chứa API Key ngẫu nhiên của bạn.
          </p>
          <pre style={{ background: 'var(--color-gray-900)', color: '#e2e8f0', padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius)', fontSize: 'var(--font-size-xs)', overflowX: 'auto', lineHeight: 1.6 }}>
{`Header:
  x-api-key: 7d8c4e5b6a1f2e...your_api_key
  Content-Type: application/json`}
          </pre>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
        <div className="card-header"><div className="card-header-title">Gửi tin ZNS</div></div>
        <div className="card-body">
          <p style={{ marginBottom: 8 }}><span className="badge badge-success">POST</span> <code style={{ marginLeft: 8, background: 'var(--color-gray-100)', padding: '2px 8px', borderRadius: 4 }}>/api/v1/zns/send</code></p>
          <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Gửi tin nhắn ZNS tới số điện thoại người nhận</p>

          <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 8 }}>Request Body</h4>
          <div className="table-wrapper" style={{ marginBottom: 'var(--spacing-md)' }}>
            <table className="table">
              <thead><tr><th>Tham số</th><th>Kiểu</th><th>Bắt buộc</th><th>Mô tả</th></tr></thead>
              <tbody>
                <tr><td><code>phone</code></td><td>string</td><td>Có</td><td>Số điện thoại (bắt đầu bằng 84)</td></tr>
                <tr><td><code>template_id</code></td><td>int</td><td>Có</td><td>ID template từ danh sách templates</td></tr>
                <tr><td><code>template_data</code></td><td>object</td><td>Có</td><td>Dữ liệu tham số template</td></tr>
                <tr><td><code>ref_id</code></td><td>string</td><td>Không</td><td>ID tham chiếu từ hệ thống của bạn</td></tr>
                <tr><td><code>callback_url</code></td><td>string</td><td>Không</td><td>URL nhận kết quả gửi tin</td></tr>
              </tbody>
            </table>
          </div>

          <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 8 }}>Ví dụ Request</h4>
          <pre style={{ background: 'var(--color-gray-900)', color: '#e2e8f0', padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius)', fontSize: 'var(--font-size-xs)', overflowX: 'auto', lineHeight: 1.6 }}>
{`curl -X POST http://your-domain.com/api/v1/zns/send \\
  -H "x-api-key: 7d8c4e5b6a1f2e..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "phone": "84987654321",
    "template_id": 3716,
    "template_data": {
      "customer_name": "Nguyễn Văn A",
      "order_id": "DH001"
    },
    "ref_id": "my-ref-001"
  }'`}
          </pre>

          <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginTop: 'var(--spacing-md)', marginBottom: 8 }}>Response (202 Accepted)</h4>
          <pre style={{ background: 'var(--color-gray-900)', color: '#e2e8f0', padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius)', fontSize: 'var(--font-size-xs)', overflowX: 'auto', lineHeight: 1.6 }}>
{`{
  "success": true,
  "data": {
    "tracking_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "QUEUED"
  }
}`}
          </pre>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
        <div className="card-header"><div className="card-header-title">Tra cứu trạng thái</div></div>
        <div className="card-body">
          <p style={{ marginBottom: 8 }}><span className="badge badge-primary">GET</span> <code style={{ marginLeft: 8, background: 'var(--color-gray-100)', padding: '2px 8px', borderRadius: 4 }}>/api/v1/zns/status/:tracking_id</code></p>
          <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Tra cứu trạng thái tin nhắn theo tracking ID</p>
          <pre style={{ background: 'var(--color-gray-900)', color: '#e2e8f0', padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius)', fontSize: 'var(--font-size-xs)', overflowX: 'auto', lineHeight: 1.6 }}>
{`{
  "success": true,
  "data": {
    "tracking_id": "...",
    "phone": "84987654321",
    "template_id": 3716,
    "status": "SUCCESS",
    "fpt_message_id": "fpt-msg-id-123",
    "sent_at": "2026-09-21T10:00:00Z",
    "delivered_at": "2026-09-21T10:00:05Z"
  }
}`}
          </pre>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
        <div className="card-header"><div className="card-header-title">Lấy danh sách Templates</div></div>
        <div className="card-body">
          <p style={{ marginBottom: 8 }}><span className="badge badge-primary">GET</span> <code style={{ marginLeft: 8, background: 'var(--color-gray-100)', padding: '2px 8px', borderRadius: 4 }}>/api/v1/zns/templates</code></p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Lấy danh sách tất cả templates khả dụng cho tài khoản của bạn</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-header-title">Trạng thái tin nhắn</div></div>
        <div className="card-body">
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Trạng thái</th><th>Mô tả</th></tr></thead>
              <tbody>
                <tr><td><span className="badge badge-warning">QUEUED</span></td><td>Tin nhắn đang trong hàng đợi chờ gửi</td></tr>
                <tr><td><span className="badge badge-primary">SENT</span></td><td>Đã gửi lên FPT, chờ kết quả</td></tr>
                <tr><td><span className="badge badge-success">SUCCESS</span></td><td>Gửi thành công tới người nhận</td></tr>
                <tr><td><span className="badge badge-danger">FAILED</span></td><td>Gửi thất bại (xem mã lỗi chi tiết)</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
