import { ClsModule } from "nestjs-cls";

export const MIXPANEL_OPTIONS = 'MIXPANEL_OPTIONS';
export const REQUEST_CTX_KEY = Symbol('req');

export const MixpanelClsModule = ClsModule.forRoot({
  global: true,
  middleware: {
    mount: true,
    generateId: true,
    setup: (cls, req) => {
      cls.set(REQUEST_CTX_KEY, {
        headers: req.headers,
        session: req.session,
        user: req.user,
      });
    }
  }
});
