import eventlet
eventlet.monkey_patch()

from flask import Flask, render_template, jsonify, request, session, redirect, url_for
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import os
import random
import time
from typing import Dict, Any

app = Flask(__name__)
app.secret_key = os.urandom(24)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# 2015년부터 2024년까지의 종목별 수익률 데이터
game_data: Dict[str, Dict[str, int]] = {
    'A': {'2015': 26, '2016': 126, '2017': 1324, '2018': -73, '2019': 94, '2020': 304, '2021': 59, '2022': 64, '2023': 155, '2024': 120},
    'B': {'2015': 17, '2016': 69, '2017': 3716, '2018': -74, '2019': -15, '2020': 154, '2021': 3354, '2022': -58, '2023': 22, '2024': 268},
    'C': {'2015': 0, '2016': -44, '2017': 9172, '2018': -82, '2019': -2, '2020': 473, '2021': 398, '2022': -67, '2023': 90, '2024': 46},
    'D': {'2015': 0, '2016': 0, '2017': 0, '2018': 0, '2019': 0, '2020': 586, '2021': 11144, '2022': -94, '2023': 919, '2024': 85},
    'E': {'2015': 7, '2016': 10, '2017': 45, '2018': 6, '2019': 25, '2020': 743, '2021': 49, '2022': -65, '2023': 101, '2024': 62},
    'F': {'2015': 64, '2016': 223, '2017': 81, '2018': -31, '2019': 76, '2020': 121, '2021': 125, '2022': -50, '2023': 238, '2024': 171},
    'G': {'2015': 7, '2016': 295, '2017': -9, '2018': 79, '2019': 148, '2020': 99, '2021': 56, '2022': -54, '2023': 127, '2024': -18},
    'H': {'2015': -10, '2016': 8, '2017': 13, '2018': -1, '2019': 18, '2020': 25, '2021': -3, '2022': 0, '2023': 13, '2024': 27},
    'I': {'2015': 0, '2016': 0, '2017': 0, '2018': -31, '2019': 28, '2020': 434, '2021': 143, '2022': -29, '2023': -44, '2024': -58},
    'J': {'2015': 117, '2016': 27, '2017': 109, '2018': 2, '2019': -15, '2020': 102, '2021': -43, '2022': -15, '2023': 25, '2024': -2},
    'K': {'2015': -5, '2016': 43, '2017': 41, '2018': -24, '2019': 44, '2020': 45, '2021': -3, '2022': -29, '2023': 41, '2024': -32},
    'L': {'2015': -5, '2016': -33, '2017': 77, '2018': -24, '2019': 49, '2020': 153, '2021': 44, '2022': -52, '2023': 2, '2024': -29},
    'M': {'2015': -41, '2016': -1, '2017': 30, '2018': -2, '2019': -13, '2020': 12, '2021': 34, '2022': -21, '2023': 4, '2024': -5},
    'N': {'2015': 0, '2016': 0, '2017': 0, '2018': 0, '2019': 0, '2020': 135, '2021': -22, '2022': -64, '2023': 167, '2024': 340}
}
GAME_YEARS = [str(year) for year in range(2015, 2025)]
HINT_DATA = {
    'A': {'2015': '가격 바닥 탈출', '2016': '두 번째 반감기(7월)로 공급량 축소', '2017': 'ico열풍 및 암호화폐 열풍', '2018': '급락장(버블 붕괴)', '2019': '미중 무역전쟁 속 디지털 안전자산 부각', '2020': '코로나19 + 기관투자 유입', '2021': '테슬라 결제 수락 ATH', '2022': 'FTX 파산, 금리인상 여파 급락', '2023': '블랙록 ETF 승인 기대', '2024': '현물 ETF 승인, 반감기(4월)'},
    'B': {'2015': '소규모 커뮤니티 밈으로 주목', '2016': '트레이더들 단기 트레이딩 수단', '2017': 'ICO 붐', '2018': '하락장', '2019': '트윗 및 틱톡 유행으로 유동성 유입', '2020': '일론 머스크 트윗', '2021': '머스크 SNL 출연', '2022': '트위터 결제수단 기대', '2023': '트위터 리브랜딩(X) 언급', '2024': '투기수요 위축'},
    'C': {'2015': '상장 전', '2016': 'DAO 해킹사태로 하드포크', '2017': 'ICO 붐', '2018': '버블버블', '2019': '디파이의 태동', '2020': '유니스왑의 성장', '2021': 'NFT붐', '2022': '체굴 방식 변경 작업증명 >> 지분증명', '2023': 'L2확장', '2024': 'ETF승인 기대'},
    'D': {'2015': '상장 전', '2016': '상장 전', '2017': '상장 전', '2018': '상장 전', '2019': '상장 전', '2020': '메인넷 론칭', '2021': 'NFT붐', '2022': 'FTX파산 연계', '2023': '저렴한 수수료', '2024': '고성능 L1 대안 강조'},
    'E': {'2015': '신규 모델 출시', '2016': 'os 성능개선', '2017': '기존모델 양산화 문제발생', '2018': 'SEC의 제제', '2019': '대량생산 체제 확보', '2020': 'S&P500 편입', '2021': '도지 연계', '2022': '오너리스크', '2023': '가격 인하 전략', '2024': 'ai, 로보택시 기대'},
    'F': {'2015': '시장확대 및 시장 점유율 증가', '2016': '지속적인 시장 점유율 증가', '2017': '비트코인 채굴 수해주 등급', '2018': '암호화폐 버블 및 미중 무역전쟁 여파', '2019': '데이터센터 수요 증가', '2020': '코로나 이후 pc 수요 증가', '2021': 'ARM 인수 추진', '2022': '미중 규제', '2023': 'chat gpt 붐!!', '2024': 'ai 투자사이글 지속'},
    'G': {'2015': '상품 성능 부진...', '2016': '신규 cpu출시', '2017': '경쟁사점유율 증가로 점유율 하락', '2018': '데이터센터 수요확장', '2019': '7nm 공정 및 산업 주도', '2020': '비디오게임기 수요 급증', '2021': '자일링스 인수발표', '2022': 'pc 수요둔화', '2023': 'ai gpu 출시기대', '2024': '데이터센터 및 ai수요 증가'},
    'H': {'2015': '미 연준 금리인상', '2016': '브렉시트 쇼크로 안전자산 수요증가', '2017': '위험자산 랠리속 박스권', '2018': '미중 무역갈등 수요증가', '2019': '경기둔화 우려', '2020': '코로나 19 충격', '2021': '백신보급으로 수요둔화', '2022': '우크라이나 전쟁 발발', '2023': '인플레이션 정점 으로 수요 둔화', '2024': '금리 인하로 사상최고가 경신'},
    'I': {'2015': '상장 전', '2016': '상장 전', '2017': '상장 전', '2018': '상장 전', '2019': 'R&D스타트업', '2020': '코로나 19 백신 후보', '2021': '백신 대량 공급', '2022': '코로나 수요 둔화', '2023': 'RSV백신 개발', '2024': '차세대 mRNA 백신 확대 + 정부 수주 발표'},
    'J': {'2015': '바이오시밀러', '2016': '신규 제품 유럽 승인', '2017': '코스피 이전 상장', '2018': '램시마 SC 유럽 판매 승인', '2019': '바이오주 전반적 조정기', '2020': '코로나19 항체치료제 임상 착수', '2021': '렉키로나 유럽 승인', '2022': '수익성 둔화 우려', '2023': '합병 추진 발표', '2024': '합병 완료, 포트폴리오 강화 발표'},
    'K': {'2015': '반도체 수익 증가', '2016': '제품 발화 사건', '2017': '메모리 슈퍼사이클', '2018': '반도체 업황 둔화우려', '2019': '비메모리 투자발표', '2020': '코로나 이후 수요증가', '2021': '신고가 갱신', '2022': '글로벌 금리 인상', '2023': 'HBM 수요 증가로 회복세', '2024': 'AI 메모리 수혜 기대'},
    'L': {'2015': '스마트폰 보급으로 사용층 확대', '2016': '캐릭터 사업 확장!', '2017': '플렛폼 독점적 성장', '2018': '플랫폼 확장 페이', '2019': '플랫폭 확장 뱅크', '2020': '언택트 트렌드', '2021': '빅테크 규제 우려', '2022': '플랫폼 규제 강화', '2023': '오너리스크', '2024': '수익화 개선 전략 발표'},
    'M': {'2015': '어반자카파 회항', '2016': '이륙중 엔진 폭발', '2017': '글로벌 마케팅 전략 강화', '2018': '안전영상에 K‑팝 SuperM 등장,  ', '2019': '유가변동 오너리스크', '2020': '코로나 19타격으로 여객금감', '2021': '화물수익 급증', '2022': '유가급증으로 비용부담', '2023': '여객수요회복', '2024': '유류비 안정화 아시아나 인수 승인 기대'},
    'N': {'2015': '상장 전', '2016': '상장 전', '2017': '상장 전', '2018': '상장 전', '2019': '상장 전', '2020': '나스닥 직상장', '2021': '아크펀드 편입', '2022': '성장 둔화우려', '2023': 'ai 수요증가 수익성 강화', '2024': '정부 민강 수주 증가 및 ai플랫폼 확장'}
}


# 사용자 데이터 (메모리 내 데이터베이스)
users: Dict[str, Dict[str, Any]] = {
    "root": {"password": "1234"} 
}

# 전역 게임 상태
game_state: Dict[str, Any] = {
    "current_year_index": -1,
    "game_phase": "not_started",  # not_started, hint, investment
    "round_start_time": None,
    "round_duration": 180,  # 3 minutes in seconds
    "hint_requests": [],
    "revive_requests": []
}

def get_current_year():
    if 0 <= game_state['current_year_index'] < len(GAME_YEARS):
        return GAME_YEARS[game_state['current_year_index']]
    return None

def _process_round_end():
    """라운드 종료 로직 (결과 계산, 자동 투자 등)"""
    year_to_process = get_current_year()
    print(year_to_process)
    print(game_state['game_phase'])
    
    if not year_to_process or game_state['game_phase'] not in ['investment', 'settling']:
        return
    
    print(year_to_process)

    # 마지막 라운드 자동 투자 로직 (2024년만)
    if year_to_process == '2024':
        all_stocks = list(game_data.keys())
        for username, user_data in users.items():
            if username == 'root' or not user_data.get('online'):
                continue
            # 자동 투자 대상(아직 투자하지 않은 유저)만 0으로
            if year_to_process not in user_data.get('investments', {}):
                points_to_invest = user_data.get('points', 0)
                if points_to_invest > 0:
                    chosen_stock = random.choice(all_stocks)
                    user_data['points'] = 0
                    user_data.setdefault('investments', {})[year_to_process] = {
                        'investments': [{"chosen_stock": chosen_stock, "invested_amount": points_to_invest}],
                        'initial_investment': points_to_invest, 'processed': False, 'auto_invested': True
                    }

    # 모든 사용자의 투자 결과 처리
    
    for username, user_data in users.items():
        if username == 'root': continue  # 관리자는 투자 결과 계산에서 제외
        
        # 올해(year_to_process) 투자 내역만 처리
        round_investment_data = user_data.get('investments', {}).get(year_to_process)
        
        # 투자 내역이 없거나 이미 처리(processed)됐으면 건너뜀
        if not round_investment_data or round_investment_data.get('processed'):
            continue
        total_points_returned = 0.0  # 이번 라운드에서 돌려줄 총 금액(투자금+수익/손실)
        for investment in round_investment_data.get('investments', []):  # 각 종목별 투자 내역 반복
            stock = investment['chosen_stock']  # 투자한 종목명
            amount = investment['invested_amount']  # 투자 금액
            actual_return_percent = game_data[stock][year_to_process]  # 해당 종목의 실제 수익률(%)
            leverage = investment.get('leverage', 1)
            # 손익 계산: (투자금 * (수익률/100) * 레버리지)
            points_change = amount * (actual_return_percent / 100.0) * leverage
            total_return = amount + points_change
            if total_return < 0:
                total_return = 0
            total_points_returned += total_return
            investment['return_percent'] = actual_return_percent  # 투자 내역에 실제 수익률 기록
            investment['leverage'] = leverage  # 투자 내역에 레버리지 기록
            investment['points_change'] = round(points_change)  # 투자 내역에 수익(손익) 기록
        user_data['points'] = round(user_data.get('points', 0) + total_points_returned)  # 유저의 보유 포인트 갱신(기존+이번 라운드 투자금+수익)
        round_investment_data['processed'] = True  # 이 라운드 투자 내역이 처리됐음을 표시
        round_investment_data['total_points_change'] = round(total_points_returned)  # 라운드 총 반환 금액 기록
        round_investment_data['total_profit_loss'] = round(total_points_returned - round_investment_data.get('initial_investment', 0))  # 수익/손실만
        round_investment_data['points_after'] = user_data['points']  # 라운드 종료 후 보유 포인트 기록

    game_state['game_phase'] = "round_over"  # 게임 상태를 라운드 종료로 변경
    game_state['round_start_time'] = None  # 라운드 타이머 초기화
    broadcast_state()  # 정산 후 모든 클라이언트에 최신 상태 전송


def _check_and_end_round_if_timed_out():
    """타이머를 확인하고 시간이 다 되면 라운드를 종료"""
    if game_state['game_phase'] != 'investment' or not game_state.get('round_start_time'):
        return False
    
    elapsed_time = time.time() - game_state['round_start_time']
    if elapsed_time > game_state['round_duration']:
        _process_round_end()
        return True
    return False

def get_full_state(username=None):
    if _check_and_end_round_if_timed_out():
        # If the round ended, we need to generate a fresh state
        pass

    online_users = {name: data for name, data in users.items() if name != 'root' and data.get('online')}
    user_list = [{"username": name, "points": data.get("points", 0)} for name, data in online_users.items()]
    
    current_year = get_current_year()
    invested_users = []
    if current_year and game_state['game_phase'] == 'investment':
        for uname in online_users:
            if current_year in users[uname].get('investments', {}):
                invested_users.append(uname)
    
    round_end_time = None
    if game_state.get('round_start_time') and game_state['game_phase'] == 'investment':
        round_end_time = game_state['round_start_time'] + game_state['round_duration']

    state = {
        "game_state": game_state, "current_year": current_year, "users": user_list,
        "online_user_count": len(online_users), "game_years_count": len(GAME_YEARS),
        "invested_users": invested_users, "round_end_time": round_end_time,
        "hint_requests": game_state.get('hint_requests', []),
        "available_stocks": list(game_data.keys()),
        "revive_requests": game_state.get('revive_requests', []),
    }
    
    if username and username != 'root':
        user_data = users.get(username, {})
        has_invested = False
        if current_year:
            has_invested = current_year in user_data.get('investments', {})
        state['user'] = user_data
        state['user_has_invested'] = has_invested

    return state

@socketio.on('connect')
def on_connect():
    print('Client connected, session:', dict(session))

@socketio.on('disconnect')
def on_disconnect():
    username = session.get('username')
    if username and username in users and username != 'root':
        users[username]['online'] = False
        broadcast_state()
    print('Client disconnected')

@socketio.on('register')
def on_register():
    print('Register event, session:', dict(session))
    username = session.get('username')
    if not username:
        return

    if username == 'root':
        users[username]['online'] = True
    else:
        if users.get(username):
            users[username]['online'] = True
    
    emit('state_update', get_full_state(username))
    if username != 'root': # Notify admin of new user
        socketio.emit('state_update', get_full_state('root'))


def broadcast_state():
    for u_name, u_data in users.items():
        if u_data.get('online'):
            sid = u_data.get('sid')
            if sid:
                socketio.emit('state_update', get_full_state(u_name), to=sid)

@socketio.on('associate_sid')
def associate_sid():
    username = session.get('username')
    if username and username in users:
        users[username]['sid'] = request.sid

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login_page():
    # 이미 로그인되어 있으면 권한에 따라 바로 이동
    if session.get('username'):
        if session.get('is_admin'):
            return redirect(url_for('admin_page'))
        else:
            return redirect(url_for('user_page'))
    return render_template('login.html')

@app.route('/admin')
def admin_page():
    if not session.get('username') or not session.get('is_admin'):
        return redirect(url_for('login_page'))
    return render_template('admin.html')

@app.route('/user')
def user_page():
    if not session.get('username') or session.get('is_admin'):
        return redirect(url_for('login_page'))
    return render_template('user.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    
    if not username:
        return jsonify({"success": False, "message": "사용자 이름을 입력해주세요."})

    if username == 'root':
        if data.get('password') == users['root'].get('password'):
            session['username'] = 'root'; session['is_admin'] = True
            users['root']['online'] = True
            return jsonify({"success": True, "is_admin": True})
        else:
            return jsonify({"success": False, "message": "관리자 비밀번호가 틀렸습니다."})

    if users.get(username, {}).get('online'):
        return jsonify({"success": False, "message": "이미 접속 중인 사용자입니다."})

    if username not in users:
        users[username] = {"points": 1000, "investments": {}, "revealed_hints": {}}
    
    users[username]['online'] = True
    session['username'] = username
    session['is_admin'] = False
    return jsonify({"success": True, "is_admin": False})

@app.route('/api/logout', methods=['POST'])
def logout():
    username = session.get('username')
    if username and users.get(username):
        users[username]['online'] = False
    session.clear()
    broadcast_state() # Notify others of logout
    return jsonify({"success": True})

@socketio.on('admin_action')
def handle_admin_action(data):
    global game_state, users
    if not session.get('is_admin'): return
    action = data.get('action')

    if action == 'start_round':
        if game_state['game_phase'] in ["not_started", "round_over"]:
            if game_state['current_year_index'] < len(GAME_YEARS) - 1:
                game_state['current_year_index'] += 1
                game_state['game_phase'] = "hint"
                game_state['hint_requests'] = []
                for user_data in users.values():
                    if 'revealed_hints' in user_data:
                        user_data['revealed_hints'] = {}
    
    elif action == 'start_investment':
        if game_state['game_phase'] == 'hint':
            game_state['game_phase'] = "investment"
            game_state['round_start_time'] = time.time()

    elif action == 'end_round':
        if game_state['game_phase'] == 'investment':
            game_state['game_phase'] = 'settling'
    
    elif action == 'settle_result':
        # 정산 실행
        _process_round_end()
        # 다음 라운드로 자동 진입 (힌트 요청 단계)
        if game_state['current_year_index'] < len(GAME_YEARS) - 1:
            game_state['current_year_index'] += 1
            game_state['game_phase'] = 'hint'
            game_state['hint_requests'] = []
            for user_data in users.values():
                if 'revealed_hints' in user_data:
                    user_data['revealed_hints'] = {}
        else:
            game_state['game_phase'] = 'game_over'
        broadcast_state()
        return
    
    elif action == 'reset_game':
        # 게임 데이터 전체 초기화
        # 관리자 계정만 남기고 모두 삭제
        users = {k: v for k, v in users.items() if k == 'root'}
        users['root']['online'] = False
        game_state = {
            "current_year_index": -1,
            "game_phase": "not_started",
            "round_start_time": None,
            "round_duration": 180,
            "hint_requests": [],
            "revive_requests": []
        }
        broadcast_state()
        return
    
    elif action == 'approve_revive':
        revive_username = data.get('username')
        for req in game_state['revive_requests']:
            if req['username'] == revive_username and req['status'] == 'pending':
                req['status'] = 'approved'
                users[revive_username]['points'] = 1000
                break
        # 승인된 요청은 목록에서 제거
        game_state['revive_requests'] = [r for r in game_state['revive_requests'] if r['status'] != 'approved']
        broadcast_state()
        return
    
    broadcast_state()

@socketio.on('user_action')
def handle_user_action(data):
    username = session.get('username')
    if not username or username == 'root': return
    action = data.get('action')

    if action == 'request_hint':
        stock = data.get('stock')
        if game_state['game_phase'] != 'hint': return
        if not stock: return

        is_duplicate = any(req['stock'] == stock for req in game_state['hint_requests'])
        if is_duplicate: return

        game_state['hint_requests'].append({"username": username, "stock": stock, "status": "pending"})
        broadcast_state()

    elif action == 'invest':
        if game_state['game_phase'] != 'investment': return
        
        user = users[username]
        current_year = get_current_year()
        if current_year in user.get('investments', {}): return

        investments = data.get('investments', [])
        total_investment_amount = sum(int(inv.get('amount', 0)) for inv in investments)

        if user.get('points', 0) < total_investment_amount: return

        user['points'] -= total_investment_amount
        investment_details = [{
            "chosen_stock": inv['stock'],
            "invested_amount": int(inv['amount']),
            "leverage": int(inv.get('leverage', 1)) if int(inv.get('leverage', 1)) >= 1 else 1
        } for inv in investments]
        
        user.setdefault('investments', {})[current_year] = {
            'investments': investment_details, 'initial_investment': total_investment_amount, 'processed': False
        }
        broadcast_state()

    elif action == 'revive_request':
        # 포인트 0인 유저만 부활 요청 가능
        user = users[username]
        if user.get('points', 0) == 0 and username not in [r['username'] for r in game_state['revive_requests']]:
            game_state['revive_requests'].append({"username": username, "status": "pending"})
            broadcast_state()

@socketio.on('approve_hint')
def approve_hint(data):
    if not session.get('is_admin'): return
    
    req_username = data.get('username')
    req_stock = data.get('stock')
    current_year = get_current_year()

    for req in game_state['hint_requests']:
        if req['username'] == req_username and req['stock'] == req_stock:
            req['status'] = 'approved'
            break
    
    user_data = users.get(req_username)
    if user_data and current_year:
        hint_text = HINT_DATA.get(req_stock, {}).get(current_year, "N/A")
        user_hints = user_data.setdefault('revealed_hints', {}).setdefault(current_year, [])
        if not any(h['stock'] == req_stock for h in user_hints):
            user_hints.append({"stock": req_stock, "hint": hint_text})

    broadcast_state()


@app.route('/api/admin/results', methods=['GET'])
def get_results():
    if not session.get('is_admin'):
        return jsonify({"success": False, "message": "권한이 없습니다."}), 403
    
    year_to_check = get_current_year()
    if not year_to_check:
        return jsonify({"success": False, "message": "결과를 조회할 라운드가 없습니다."})

    # phase가 settling일 때도 투자내역 반환
    all_results = []
    for username, data in users.items():
        if username == 'root': continue
        
        user_investments = data.get('investments', {})
        if isinstance(user_investments, dict):
            round_investment = user_investments.get(year_to_check)
            if round_investment and (round_investment.get('processed') or game_state['game_phase'] == 'settling'):
                # 수익률 보정
                for inv in round_investment.get('investments', []):
                    if 'return_percent' not in inv:
                        inv['return_percent'] = game_data[inv['chosen_stock']][year_to_check]
                # 총 손익 계산 (정산중에도 계산)
                if game_state['game_phase'] == 'settling':
                    total_points_change = round_investment.get('total_points_change', 0)
                else:
                    total_points_change = round_investment.get('total_points_change', 0)
                all_results.append({
                    "username": username,
                    "investments": round_investment.get('investments', []),
                    "total_points_change": total_points_change,
                    "points_after": round_investment.get('points_after', 0),
                    "note": round_investment.get('note', "")
                })
    # 종목별 수익률
    bar_chart_stocks = {stock: game_data[stock][year_to_check] for stock in game_data}
    
    return jsonify({
        "success": True,
        "year": year_to_check,
        "results": all_results,
        "bar_chart_stocks": bar_chart_stocks,
        "phase": game_state.get('game_phase', '')
    })

@app.route('/api/check_session', methods=['GET'])
def check_session():
    username = session.get('username')
    if not username:
        return jsonify({"logged_in": False})
    is_admin = session.get('is_admin', False)
    user_data = users.get(username)
    if is_admin:
        return jsonify({"logged_in": True, "is_admin": True})
    else:
        user_info = dict(user_data) if user_data else {}
        user_info['username'] = username
        return jsonify({"logged_in": True, "is_admin": False, "user": user_info})

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=10000) 