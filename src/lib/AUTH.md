# 认证系统

> 文件: `src/lib/auth-context.tsx` + `src/app/login/page.tsx`
> Supabase Auth + Google OAuth + 邮箱密码注册

---

## 登录方式

| 方式 | 说明 |
|------|------|
| Google OAuth | 一键登录，Supabase 原生支持 |
| 邮箱 + 密码 | 注册/登录，支持邮箱确认（需配 SMTP） |
| 密码重置 | 发送重置邮件 → 跳转设新密码表单 |

Magic Link 方法仍保留在 AuthContext 中（`signInWithMagicLink`），但 UI 已替换为密码表单。

## 认证流程

```
用户打开网站 → 首页自由浏览（无需登录）
    │
    └── 点击工具 → RequireAuth 检查
            ├── 已登录 → 进入
            └── 未登录 → /login?redirect=xxx
                  ├── Google OAuth
                  └── 邮箱 + 密码（注册/登录切换）
                       ├── 新用户注册 → 确认邮件（如开启）→ 登录
                       └── 忘记密码 → 重置邮件 → 设新密码表单
```

## AuthContextValue 接口

```typescript
interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isPasswordRecovery: boolean;         // PASSWORD_RECOVERY 事件触发
  signInWithGoogle: () => Promise<void>;
  signInWithMagicLink: (email) => Promise<{ error }>;
  signUp: (email, password) => Promise<{ error, needsConfirmation }>;
  signInWithPassword: (email, password) => Promise<{ error }>;
  resetPassword: (email) => Promise<{ error }>;
  updatePassword: (password) => Promise<{ error }>;
  clearPasswordRecovery: () => void;
  signOut: () => Promise<void>;
}
```

## 密码重置流程

1. 用户输入邮箱 → 点"忘记密码/设置密码"
2. 调 `resetPassword()` → Supabase 发邮件（链接指向 `/login`）
3. 用户点邮件链接 → Supabase 触发 `PASSWORD_RECOVERY` 事件
4. `AuthProvider.onAuthStateChange` 捕获事件 → 设 `isPasswordRecovery = true`
5. 登录页检测到 `isPasswordRecovery` → 显示"设置新密码"表单
6. 用户输入新密码 → `updatePassword()` → 密码保存 → 跳转首页

## 关键组件

| 文件 | 职责 |
|------|------|
| `auth-context.tsx` | AuthProvider + useAuth hook |
| `require-auth.tsx` | RequireAuth 守卫组件 |
| `migrate-local-data.ts` | 首次登录 localStorage → Supabase 迁移 |
| `login/page.tsx` | 登录/注册/重置密码 UI |

## Supabase SMTP 配置

Supabase 免费版自带邮件服务限制极严（每小时 2-3 封），需配自定义 SMTP：

Dashboard → Project Settings → Authentication → SMTP Settings → Enable Custom SMTP

| 字段 | Gmail 示例 |
|------|-----------|
| Host | `smtp.gmail.com` |
| Port | `465` 或 `587` |
| Username | Gmail 地址 |
| Password | Gmail 应用专用密码 |
| Sender email | 同上 |
| Sender name | `PP 学习工具箱` |

Gmail 应用专用密码：Google 账号 → 安全性 → 两步验证 → 应用专用密码。

## Supabase 邮箱确认

Dashboard → Authentication → Notifications → Email → **Confirm email** 开关：
- **开启**：注册后发确认邮件，点击链接后才能登录
- **关闭**：注册即可用

⚠️ 同一邮箱重复 `signUp` 时，Supabase 为防枚举攻击会静默返回成功但不做任何事。已有用户需通过"忘记密码"设密码。
