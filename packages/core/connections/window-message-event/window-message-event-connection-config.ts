import { IWindowMessageEventTarget } from '../../types/targets/window-message-event-target';

export interface IBaseWindowMessageEventConnectionConfig {

    /**
     * {@link window} to which new message events will be dispatched for interaction
     *
     * * When used with an iframe in an main area:
     *     * You can use {@link HTMLIFrameElement.contentWindow}
     * * When used with an iframe in an iframe area:
     *     * If you have access to the iframe window (CORS policy), you can use current iframe {@link window}
     *     * If you don't have access to the iframe window (CORS policy),
     *       you will have to use the {@link parent} window of the current iframe window
     */
    postMessageTarget: IWindowMessageEventTarget;

    /**
     * The {@link window} from which events of new messages for interaction will come.
     *
     * * When used with an iframe in an main area:
     *     * If you have access to the iframe window (CORS policy), you can use {@link HTMLIFrameElement.contentWindow}
     *     * If you don't have access to the iframe window (CORS policy),
     *       you will have to use the current main {@link window} which is the parent of the iframe window
     * * When used with an iframe in an iframe area:
     *     * If you have access to the iframe window (CORS policy), you can use current iframe {@link window}
     *     * If you don't have access to the iframe window (CORS policy),
     *       you will have to use the {@link parent} window of the current iframe window
     */
    eventListenerTarget: IWindowMessageEventTarget;

    /**
     * This string is used to determine the domain to which these messages are intended.
     * This string will also be used to check that the input messages were received from the expected domain
     * @default document.location.origin
     */
    targetOrigin?: string;
}
