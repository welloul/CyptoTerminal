import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { BehaviorSubject, Observable, retry, tap, catchError, EMPTY, timer } from 'rxjs';

export interface MarketMetric {
    long: number;
    short: number;
}

export interface Liquidation {
    price: number;
    side: string; // "BUY" or "SELL"
    qty: number;
    ts: number;
}

export interface MarketState {
    symbol: string;
    price: number;
    fundingRate: number;
    basis: number;
    premiumIndex: number;
    ratios: {
        global: MarketMetric;
        topAccounts: MarketMetric;
        topPositions: MarketMetric;
    };
    momentum: {
        cvd: number;
        openInterest: number;
        takerBuy: number;
        takerSell: number;
    };
    history: {
        price: any[];
        oi: any[];
        cvd: any[];
    };
    liquidations: Liquidation[];
    social?: {
        galaxyScore: number;
        altRank: number;
        sentiment: number;
        sentimentLabel: string;
        pulse: { text: string; sentiment: string; timestamp: number }[];
    };
    news?: {
        global: { title: string; url: string; source: string }[];
        asset: { title: string; url: string; source: string }[];
    };
    scannerSignals?: {
        timestamp: string;
        symbol: string;
        price: number;
        rsi: number;
        delta: number;
        top_ratio: number;
    }[];
    dpe?: {
        score: number;
        label: string;
        details: string;
    };
}

@Injectable({
    providedIn: 'root'
})
export class MarketDataService {
    public apiUrl: string;
    private socket$: WebSocketSubject<any>;
    private stateSubject = new BehaviorSubject<MarketState | null>(null);

    public state$ = this.stateSubject.asObservable();
    public isConnected$ = new BehaviorSubject<boolean>(false);

    constructor() {
        // Switch between Local and Production Backend
        const isLocal = window.location.hostname === 'localhost';
        this.apiUrl = isLocal ? 'http://localhost:8000' : 'https://cyptoterminal.onrender.com';
        const wsUrl = isLocal ? 'ws://localhost:8000/ws' : 'wss://cyptoterminal.onrender.com/ws';

        this.socket$ = webSocket({
            url: wsUrl,
            openObserver: {
                next: () => {
                    console.log('WebSocket connected');
                    this.isConnected$.next(true);
                }
            },
            closeObserver: {
                next: () => {
                    console.log('WebSocket disconnected');
                    this.isConnected$.next(false);
                }
            }
        });

        this.connect();
    }

    private connect() {
        this.socket$.pipe(
            retry({ delay: 3000 }), // Retry connection every 3s
            catchError(err => {
                console.error('WebSocket error', err);
                return EMPTY;
            })
        ).subscribe({
            next: (data) => this.stateSubject.next(data),
            error: (err) => console.error(err)
        });
    }

    public changeSymbol(symbol: string) {
        if (this.socket$) {
            this.socket$.next({ action: 'subscribe', symbol: symbol });
            // Optionally clear current state while waiting
            // this.stateSubject.next(null); 
        }
    }
}
