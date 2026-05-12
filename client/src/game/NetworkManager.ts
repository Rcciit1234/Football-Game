import { io, Socket } from 'socket.io-client';
import {
  MatchState, Team, PlayerState, BallState,
  PlayerInput, ServerEvent, ClientEvent, MatchInfo, MatchConfig
} from '../../../shared/index.js';

export class NetworkManager {
  public socket: Socket | null = null;
  public socketId: string = '';

  public onMatchFound: ((data: any) => void) | null = null;
  public onStateUpdate: ((data: any) => void) | null = null;
  public onGoalScored: ((data: any) => void) | null = null;
  public onMatchEnd: ((data: any) => void) | null = null;
  public onCountdown: ((data: any) => void) | null = null;
  public onPlayerJoined: ((data: any) => void) | null = null;
  public onPlayerLeft: ((data: any) => void) | null = null;
  public onError: ((data: any) => void) | null = null;
  public onChatMessage: ((data: any) => void) | null = null;

  connect(playerName: string) {
    this.socket = io({
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('[Network] Connected:', this.socket?.id);
      this.socketId = this.socket?.id || '';
      this.socket?.emit(ClientEvent.JoinQueue, { name: playerName });
    });

    this.socket.on('disconnect', () => {
      console.log('[Network] Disconnected');
    });

    this.socket.on(ServerEvent.MatchFound, (data) => {
      console.log('[Network] Match found:', data.matchId);
      this.onMatchFound?.(data);
    });

    this.socket.on(ServerEvent.MatchStateUpdate, (data) => {
      this.onStateUpdate?.(data);
    });

    this.socket.on(ServerEvent.GoalScored, (data) => {
      console.log('[Network] Goal!', data);
      this.onGoalScored?.(data);
    });

    this.socket.on(ServerEvent.MatchEnd, (data) => {
      console.log('[Network] Match ended:', data);
      this.onMatchEnd?.(data);
    });

    this.socket.on(ServerEvent.MatchCountdown, (data) => {
      this.onCountdown?.(data);
    });

    this.socket.on(ServerEvent.PlayerJoined, (data) => {
      this.onPlayerJoined?.(data);
    });

    this.socket.on(ServerEvent.PlayerLeft, (data) => {
      this.onPlayerLeft?.(data);
    });

    this.socket.on(ServerEvent.ChatMessage, (data) => {
      this.onChatMessage?.(data);
    });

    this.socket.on(ServerEvent.Error, (data) => {
      console.error('[Network] Error:', data);
      this.onError?.(data);
    });
  }

  sendInput(input: PlayerInput) {
    this.socket?.emit(ClientEvent.PlayerInput, input);
  }

  sendChatMessage(msg: string) {
    this.socket?.emit(ClientEvent.ChatMessage, msg);
  }

  leaveQueue() {
    this.socket?.emit(ClientEvent.LeaveQueue);
  }

  requestMatchInfo() {
    this.socket?.emit(ClientEvent.RequestMatchInfo);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}
