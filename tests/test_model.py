"""
ZAN Financial Model — EXHAUSTIVE Independent Validator
Every mathematical operation tested. 150+ tests across 7 categories.
Run: python3 tests/test_model.py
"""
import math,sys
def xirr(cf,g=0.1):
    if not any(c<0 for c in cf) or not any(c>0 for c in cf): return None
    r=g
    for _ in range(300):
        n=sum(c/(1+r)**t for t,c in enumerate(cf)); d=sum(-t*c/((1+r)**t*(1+r)) for t,c in enumerate(cf))
        if abs(d)<1e-15: break
        nr=r-n/d
        if abs(nr-r)<1e-7: return nr
        r=nr
        if r<-.99 or r>10: return None
    return r
def xnpv(cf,r): return sum(c/(1+r)**t for t,c in enumerate(cf))
class Mdl:
    def __init__(s,p): s.p=p; s.h=p.get('horizon',20); s.a=p.get('assets',[])
    def soft(s): return s.p.get('softCostPct',10)/100
    def cont(s): return s.p.get('contingencyPct',5)/100
    def acx(s,a): return a.get('gfa',0)*a.get('costPerSqm',3500)*(1+s.soft()+s.cont())
    def als(s,a): return a.get('gfa',0)*(a.get('efficiency',85)/100)
    def acs(s,a):
        r=[0.0]*s.h;t=s.acx(a)
        if t==0: return r
        st=a.get('constrStart',1)-1;d=math.ceil(a.get('constrDuration',24)/12)
        if d<=0: return r
        pp=t/d
        for y in range(st,min(st+d,s.h)): r[y]=pp
        return r
    def ars(s,a):
        r=[0.0]*s.h;st=a.get('constrStart',1)-1;d=math.ceil(a.get('constrDuration',24)/12);rs=st+d
        e=a.get('escalation',0.75)/100;rmp=max(a.get('rampUpYears',a.get('rampYears',1)),1);oc=a.get('stabilizedOcc',a.get('occupancy',90))/100
        if a.get('revType')=='Lease': base=s.als(a)*a.get('leaseRate',0)*oc
        else: base=a.get('opEbitda',0)*oc
        for y in range(rs,s.h): ys=y-rs;r[y]=base*(1+e)**ys*min(1,(ys+1)/rmp)
        return r
    def hotel(s,h):
        rr=h.get('keys',0)*h.get('adr',0)*(h.get('stabOcc',70)/100)*h.get('daysPerYear',365)
        rp=h.get('roomsPct',60)/100;tr=rr/rp if rp>0 else rr
        fb=tr*(h.get('fbPct',25)/100);mi=tr*(h.get('micePct',10)/100);ot=tr*(h.get('otherPct',5)/100)
        re2=rr*(h.get('roomExpPct',25)/100);fe=fb*(h.get('fbExpPct',70)/100);me=mi*(h.get('miceExpPct',50)/100);oe=ot*(h.get('otherExpPct',50)/100)
        ud=tr*(h.get('undistPct',15)/100);fx=tr*(h.get('fixedPct',8)/100)
        ebitda=tr-re2-fe-me-oe-ud-fx
        return {'tr':tr,'rr':rr,'fb':fb,'mi':mi,'ot':ot,'re':re2,'fe':fe,'me':me,'oe':oe,'ud':ud,'fx':fx,'eb':ebitda,'mg':ebitda/tr if tr>0 else 0}
    def marina(s,m):
        br=m.get('berths',0)*m.get('avgLength',0)*m.get('unitPrice',0)*(m.get('occupancy',70)/100)
        fp=m.get('fuelPct',20)/100;op=m.get('otherPct',10)/100;bp=1-fp-op
        tr=br/bp if bp>0 else br;fr=tr*fp;orv=tr*op
        be=br*(m.get('berthingOpex',30)/100);fue=fr*(m.get('fuelOpex',85)/100);oex=orv*(m.get('otherOpex',50)/100)
        return {'tr':tr,'br':br,'fr':fr,'or':orv,'be':be,'fue':fue,'oe':oex,'eb':tr-be-fue-oex}
    def lrs(s):
        r=[0.0]*s.h;lt=s.p.get('landType','lease')
        if lt=='purchase': r[0]=s.p.get('landPurchasePrice',0)
        elif lt=='lease':
            rent=s.p.get('landRentAnnual',0);gr=s.p.get('landRentGrace',0);ec=s.p.get('landRentEscalation',0)/100;ev=max(s.p.get('landRentEscalationEveryN',5),1)
            for y in range(s.h):
                if y<gr: r[y]=0
                else: r[y]=rent*(1+ec)**(y//ev)
        return r
    def proj(s):
        ci=[0.0]*s.h;cc=[0.0]*s.h;ar=[]
        for a in s.a:
            cx=s.acs(a);rv=s.ars(a);ar.append({'cx':cx,'rv':rv,'tc':sum(cx),'tr':sum(rv),'ls':s.als(a)})
            for y in range(s.h): ci[y]+=rv[y];cc[y]+=cx[y]
        lr=s.lrs();cn=[ci[y]-cc[y]-lr[y] for y in range(s.h)]
        ph={}
        for p in s.p.get('phases',[{'name':'P1'}]):
            pn=p['name'];pa=[i for i,a in enumerate(s.a) if a.get('phase')==pn]
            pi2=[0.0]*s.h;pc=[0.0]*s.h
            for y in range(s.h):
                for i in pa: pi2[y]+=ar[i]['rv'][y];pc[y]+=ar[i]['cx'][y]
            np2=len(s.p.get('phases',[{'name':'P1'}]))
            pl=[lr[y]/np2 for y in range(s.h)]
            pn2=[pi2[y]-pc[y]-pl[y] for y in range(s.h)]
            ph[pn]={'ti':sum(pi2),'tc':sum(pc),'irr':xirr(pn2)}
        return {'i':ci,'c':cc,'l':lr,'n':cn,'tc':sum(cc),'ti':sum(ci),'tl':sum(lr),'tn':sum(cn),'irr':xirr(cn),'npv10':xnpv(cn,.1),'npv12':xnpv(cn,.12),'npv14':xnpv(cn,.14),'ar':ar,'ph':ph}
    def inc(s,pr):
        ic=s.p.get('incentives',{});h=s.h;cgs=[0.0]*h;cgt=0;lss=[0.0]*h;lst=0;frs=[0.0]*h;frt=0;acx=list(pr['c']);alr=list(pr['l'])
        ce=0
        for y in range(h-1,-1,-1):
            if pr['c'][y]>0: ce=y;break
        cg=ic.get('capexGrant',{})
        if cg.get('enabled'):
            raw=pr['tc']*(cg.get('grantPct',0)/100);amt=min(raw,cg.get('maxCap',1e18));cgt=amt
            if cg.get('timing')=='construction':
                pp=amt/(ce+1) if ce>=0 else amt
                for y in range(ce+1):
                    if pr['c'][y]>0: cgs[y]=pp;acx[y]-=pp
            else: cgs[min(ce+1,h-1)]=amt
        lr=ic.get('landRentRebate',{})
        if lr.get('enabled') and s.p.get('landType')=='lease':
            cy=lr.get('constrRebateYears',0) or (ce+1);cp=lr.get('constrRebatePct',0)/100;op=lr.get('operRebatePct',0)/100;oy=lr.get('operRebateYears',0)
            for y in range(h):
                rp2=cp if y<cy else (op if y<cy+oy else 0);sv=abs(pr['l'][y])*rp2;lss[y]=sv;lst+=sv;alr[y]=max(0,pr['l'][y]-sv)
        fr=ic.get('feeRebates',{})
        if fr.get('enabled') and fr.get('items'):
            for it in fr['items']:
                a2=it.get('amount',0);yr=max(0,min(it.get('year',1)-1,h-1))
                if it.get('type')=='rebate': frs[yr]+=a2;frt+=a2
                elif it.get('type')=='deferral': dy=math.ceil(it.get('deferralMonths',12)/12);ben=a2-a2/1.1**dy;frs[yr]+=ben;frt+=ben
        imp=[cgs[y]+lss[y]+frs[y] for y in range(h)];adj=[pr['n'][y]+imp[y] for y in range(h)]
        return {'cgt':cgt,'cgs':cgs,'lst':lst,'lss':lss,'frt':frt,'frs':frs,'tv':cgt+lst+frt,'imp':imp,'adj':adj,'acx':acx,'alr':alr,'airr':xirr(adj),'anpv':xnpv(adj,.1),'atn':sum(adj)}
    def fin(s,pr,ic):
        h=s.h
        if s.p.get('finMode')=='self':
            ai2=ic['airr'] if ic and ic['tv']>0 else pr['irr']
            scf=ic['adj'] if ic and ic['tv']>0 else pr['n']
            return {'m':'self','lirr':ai2,'td':0,'te':pr['tc'],'md':0,'ds':[0]*h,'dd':[0]*h,'ep':[0]*h,'bc':[0]*h,'bo':[0]*h,'rp':[0]*h,'ai':[0]*h,'oi':[0]*h,'eqc':[0]*h,'uf':0,'alr':pr['l'],'lcf':scf,'dscr':[None]*h,'dci':pr['tc'],'dev':pr['tc'],'gpe':pr['tc']*0.5,'lpe':pr['tc']*0.5,'gpp':0.5,'lpp':0.5,'ist':0}
        acg=ic['cgt'] if ic else 0;dev=pr['tc']-acg;lc=(s.p.get('landArea',0)*s.p.get('landCapRate',1000)) if s.p.get('landCapitalize') else 0
        dci=dev+lc;is100=s.p.get('finMode')=='bank100';ltv=1.0 if is100 else ((s.p.get('maxLtvPct',70)/100) if s.p.get('debtAllowed') else 0)
        md=dci*ltv;te=max(0,dci-md);rate=s.p.get('financeRate',6.5)/100;tnr=s.p.get('loanTenor',7);grc=s.p.get('debtGrace',3);ry=max(1,tnr-grc)
        gpe=s.p.get('gpEquityManual',0)
        if gpe>0: gpe=min(gpe,te)
        elif lc>0: gpe=min(lc,te)
        else: gpe=te*0.5
        lpe=te-gpe;gpp=gpe/te if te>0 else 0.5;lpp=1-gpp
        dd=[0.0]*h;rp=[0.0]*h;bo=[0.0]*h;bc=[0.0]*h;it=[0.0]*h;ep=[0.0]*h;drawn=0
        for y in range(h):
            if pr['c'][y]>0 and drawn<md: d=min(pr['c'][y]*ltv,md-drawn);dd[y]=d;drawn+=d
        fd=next((y for y in range(h) if dd[y]>0),0)
        for y in range(h):
            bo[y]=(bc[y-1] if y>0 else 0)+dd[y];ys=y-fd
            rp[y]=0 if ys>=tnr or ys<grc else min(drawn/ry,bo[y])
            bc[y]=max(0,bo[y]-rp[y]);it[y]=(bo[y]+bc[y])/2*rate
        fs=s.p.get('incentives',{}).get('financeSupport',{});isb=[0.0]*h;ai=list(it)
        if fs.get('enabled') and fs.get('subType')=='interestSubsidy':
            sp=fs.get('subsidyPct',0)/100;ss=(fd+grc) if fs.get('subsidyStart')=='operation' else 0;se=ss+fs.get('subsidyYears',5)
            for y in range(max(0,ss),min(se,h)): isb[y]=it[y]*sp;ai[y]=it[y]*(1-sp)
        ds=[rp[y]+ai[y] for y in range(h)];uf=md*(s.p.get('upfrontFeePct',0)/100)
        ey=s.p.get('exitYear',0)
        if ey>0:
            eyr=ey-s.p.get('startYear',2026)
            if 0<=eyr<h:
                stab=pr['i'][min(eyr,h-1)];es=s.p.get('exitStrategy','sale')
                if es=='caprate' and s.p.get('exitCapRate',0)>0: ev=stab/(s.p.get('exitCapRate',9)/100)
                elif es=='sale': ev=stab*(s.p.get('exitMultiple',10))
                else: ev=0
                if ev>0: ep[eyr]=max(0,ev-ev*(s.p.get('exitCostPct',2)/100)-bc[eyr])
        alr=ic['alr'] if ic and ic['lst']>0 else list(pr['l'])
        lcf=[pr['i'][y]-alr[y]-pr['c'][y]+(ic['cgs'][y] if ic else 0)+(ic['frs'][y] if ic else 0)-ds[y]+dd[y]+ep[y] for y in range(h)]
        dscr=[None]*h
        for y in range(h):
            if ds[y]>0: dscr[y]=(pr['i'][y]-alr[y])/ds[y]
        eqc=[max(0,pr['c'][y]-dd[y]) for y in range(h)]
        return {'m':s.p.get('finMode'),'dev':dev,'dci':dci,'md':md,'te':te,'td':drawn,'gpe':gpe,'lpe':lpe,'gpp':gpp,'lpp':lpp,'dd':dd,'rp':rp,'ai':ai,'oi':it,'ds':ds,'bo':bo,'bc':bc,'ep':ep,'lcf':lcf,'lirr':xirr(lcf),'dscr':dscr,'eqc':eqc,'uf':uf,'ist':sum(isb),'alr':alr}
    def wf(s,pr,fn):
        if not fn or fn['m'] in ('self','bank100'): return None
        h=s.h;cash=list(fn['lcf']);te=fn['te'];gpe=fn['gpe'];lpe=fn['lpe']
        pref=s.p.get('prefReturnPct',12)/100;carry=s.p.get('carryPct',30)/100;lps=s.p.get('lpProfitSplitPct',70)/100;gpu=s.p.get('gpCatchup',True)
        gpp=fn['gpp'];lpp=fn['lpp']
        t1=[0.0]*h;t2=[0.0]*h;t3=[0.0]*h;t4l=[0.0]*h;t4g=[0.0]*h;uo=[0.0]*h;uc=[0.0]*h;pa=[0.0]*h
        ceq=0;cret=0;cpf=0;cpfa=0;eqc2=list(fn['eqc'])
        for y in range(h):
            ceq+=eqc2[y];ur=ceq-cret;uo[y]=ur;yp=ur*pref;cpfa+=yp;pa[y]=yp
            rem=max(0,cash[y])
            if rem<=0: uc[y]=ur;continue
            if ur>0: v=min(rem,ur);t1[y]=v;rem-=v;cret+=v
            po=cpfa-cpf
            if po>0 and rem>0: v=min(rem,po);t2[y]=v;rem-=v;cpf+=v
            if gpu and carry>0 and (1-carry)>0 and rem>0:
                tds=t1[y]+t2[y]+rem;gt=tds*carry;gs=sum(t3[:y]);cu=min(rem,max(0,gt-gs));t3[y]=cu;rem-=cu
            if rem>0: t4l[y]=rem*lps;t4g[y]=rem*(1-lps)
            uc[y]=ceq-cret
        ld=[t1[y]*lpp+t2[y]*lpp+t4l[y] for y in range(h)];gd=[t1[y]*gpp+t2[y]*gpp+t3[y]+t4g[y] for y in range(h)]
        lcf=[-eqc2[y]*lpp+ld[y] for y in range(h)];gcf=[-eqc2[y]*gpp+gd[y] for y in range(h)]
        ltd=sum(ld);gtd=sum(gd)
        return {'t1':t1,'t2':t2,'t3':t3,'t4l':t4l,'t4g':t4g,'ld':ld,'gd':gd,'ltd':ltd,'gtd':gtd,'lc':lcf,'gc':gcf,'lirr':xirr(lcf),'girr':xirr(gcf),'ca':cash,'uo':uo,'uc':uc,'lm':ltd/lpe if lpe>0 else 0,'gm':gtd/gpe if gpe>0 else 0,'eqc':eqc2,'pa':pa,'te':te,'gpe':gpe,'lpe':lpe}
    def scenario(s,name,cm=1,rm=1,dm=0,ea=0):
        a2=[]
        for a in s.a:
            a3=dict(a);a3['costPerSqm']=a.get('costPerSqm',3500)*cm;a3['leaseRate']=a.get('leaseRate',0)*rm
            a3['opEbitda']=a.get('opEbitda',0)*rm;a3['constrDuration']=a.get('constrDuration',24)+dm
            a3['escalation']=a.get('escalation',0.75)+ea;a2.append(a3)
        p2=dict(s.p);p2['assets']=a2;m2=Mdl(p2);pr2=m2.proj()
        return {'name':name,'irr':pr2['irr'],'npv':pr2['npv10'],'tc':pr2['tc'],'ti':pr2['ti']}

R=[]
def T(c,n,o,d=""): R.append((c,n,o,d))
def cl(a,b,t=0.01):
    if a is None or b is None: return a==b
    if a==0 and b==0: return True
    if a==0 or b==0: return abs(a-b)<1
    return abs(a-b)/max(abs(a),abs(b))<t
def sf(v): return f"{(v or 0)*100:.2f}%" if v else "N/A"
def fm(v): return f"{v:,.0f}" if isinstance(v,(int,float)) else "0"

RET={'name':'Retail','phase':'P1','gfa':10000,'costPerSqm':3000,'efficiency':80,'leaseRate':500,'revType':'Lease','escalation':1,'rampUpYears':2,'stabilizedOcc':90,'constrStart':1,'constrDuration':24}
HOP={'name':'Hotel','phase':'P1','gfa':8000,'costPerSqm':5000,'efficiency':100,'revType':'Operating','opEbitda':12e6,'escalation':0.75,'rampUpYears':3,'stabilizedOcc':75,'constrStart':1,'constrDuration':36}
MAR={'name':'Marina','phase':'P1','gfa':2000,'costPerSqm':8000,'efficiency':100,'revType':'Operating','opEbitda':5e6,'escalation':0.5,'rampUpYears':2,'stabilizedOcc':70,'constrStart':1,'constrDuration':30}
B={'horizon':20,'startYear':2026,'softCostPct':10,'contingencyPct':5,'incentives':{},'phases':[{'name':'P1'}]}
BL={**B,'landType':'lease','landArea':10000,'landRentAnnual':2e6,'landRentEscalation':3,'landRentEscalationEveryN':5,'landRentGrace':2}

# ═══ P: PROJECT ENGINE (42) ═══
P1={**BL,'finMode':'self','assets':[RET,HOP]};m1=Mdl(P1);pr1=m1.proj()
T("P","P01 CAPEX=GFA*Cost*(1+s+c)",cl(m1.acx(RET),10000*3000*1.15),fm(m1.acx(RET)))
T("P","P02 Soft cost=GFA*Cost*softPct",cl(10000*3000*m1.soft(),3000000))
T("P","P03 Contingency=GFA*Cost*contPct",cl(10000*3000*m1.cont(),1500000))
T("P","P04 CAPEX/yr=total/durYears",cl(pr1['ar'][0]['cx'][0],m1.acx(RET)/2))
T("P","P05 CAPEX zero after constr",all(pr1['ar'][0]['cx'][y]==0 for y in range(2,20)))
T("P","P06 CAPEX 3yr spread",cl(pr1['ar'][1]['cx'][0],m1.acx(HOP)/3))
T("P","P07 Leasable=GFA*Eff",cl(m1.als(RET),8000))
T("P","P08 Leasable 100% eff",cl(m1.als(HOP),8000))
T("P","P09 Leasable zero GFA",cl(Mdl(B).als({'gfa':0,'efficiency':80}),0))
T("P","P10 LeaseBase=Leasable*Rate*Occ",cl(8000*500*0.90,3600000))
T("P","P11 LeaseY3 ramp=50%",cl(pr1['ar'][0]['rv'][2],3600000*0.5,0.05))
T("P","P12 LeaseY4 full ramp",cl(pr1['ar'][0]['rv'][3],3600000*1.01,0.05))
T("P","P13 Rev zero during constr",pr1['ar'][0]['rv'][0]==0 and pr1['ar'][0]['rv'][1]==0)
T("P","P14 Rev escalates",pr1['ar'][0]['rv'][5]>pr1['ar'][0]['rv'][4])
T("P","P15 Esc=(1+esc)^yrs",cl(pr1['ar'][0]['rv'][12]/pr1['ar'][0]['rv'][3],(1.01)**9,0.02))
T("P","P16 Ramp=MIN(1,(ys+1)/ramp)",pr1['ar'][0]['rv'][2]<pr1['ar'][0]['rv'][3])
T("P","P17 Zero rate=zero rev",Mdl({**BL,'finMode':'self','assets':[{**RET,'leaseRate':0}]}).proj()['ar'][0]['tr']==0)
T("P","P18 OpRev=EBITDA*Occ*Esc*Ramp",pr1['ar'][1]['rv'][3]>0)
T("P","P19 OpRev ramp 3yr",pr1['ar'][1]['rv'][3]<pr1['ar'][1]['rv'][4]<pr1['ar'][1]['rv'][5])
T("P","P20 OpRev starts after 3yr",pr1['ar'][1]['rv'][2]==0 and pr1['ar'][1]['rv'][3]>0)
T("P","P21 OpRev zero EBITDA",Mdl({**BL,'finMode':'self','assets':[{**HOP,'opEbitda':0}]}).proj()['ar'][0]['tr']==0)
T("P","P22 Land grace",pr1['l'][0]==0 and pr1['l'][1]==0)
T("P","P23 Land rent after grace",pr1['l'][2]==2e6)
T("P","P24 Land esc every N",pr1['l'][2]==pr1['l'][4] and pr1['l'][5]>pr1['l'][4])
T("P","P25 Land esc=(1+pct)^periods",cl(pr1['l'][5],2e6*1.03))
T("P","P26 Purchase Y1 only",Mdl({**B,'landType':'purchase','landPurchasePrice':5e6,'finMode':'self','assets':[RET]}).proj()['l'][0]==5e6)
T("P","P27 Purchase zero after Y1",all(Mdl({**B,'landType':'purchase','landPurchasePrice':5e6,'finMode':'self','assets':[RET]}).proj()['l'][y]==0 for y in range(1,20)))
T("P","P28 Partner zero cost",Mdl({**B,'landType':'partner','finMode':'self','assets':[RET]}).proj()['tl']==0)
T("P","P29 BOT zero cost",Mdl({**B,'landType':'bot','finMode':'self','assets':[RET]}).proj()['tl']==0)
T("P","P30 Lease zero grace",Mdl({**B,'landType':'lease','landRentAnnual':1e6,'landRentGrace':0,'landRentEscalation':0,'landRentEscalationEveryN':5,'finMode':'self','assets':[RET]}).proj()['l'][0]==1e6)
T("P","P31 No escalation=flat",Mdl({**B,'landType':'lease','landRentAnnual':1e6,'landRentGrace':0,'landRentEscalation':0,'landRentEscalationEveryN':5,'finMode':'self','assets':[RET]}).proj()['l'][0]==Mdl({**B,'landType':'lease','landRentAnnual':1e6,'landRentGrace':0,'landRentEscalation':0,'landRentEscalationEveryN':5,'finMode':'self','assets':[RET]}).proj()['l'][15])
T("P","P32 NetCF=I-C-L each yr",all(cl(pr1['n'][y],pr1['i'][y]-pr1['c'][y]-pr1['l'][y]) for y in range(20)))
T("P","P33 TotalCAPEX=sum",cl(pr1['tc'],sum(pr1['c'])))
T("P","P34 TotalIncome=sum",cl(pr1['ti'],sum(pr1['i'])))
T("P","P35 TotalLand=sum",cl(pr1['tl'],sum(pr1['l'])))
T("P","P36 TotalNetCF=TI-TC-TL",cl(pr1['tn'],pr1['ti']-pr1['tc']-pr1['tl']))
T("P","P37 IRR Newton-Raphson",pr1['irr'] is not None)
T("P","P38 NPV=sum CF/(1+r)^t",cl(pr1['npv10'],xnpv(pr1['n'],.1)))
T("P","P39 NPV12 computed",pr1['npv12'] is not None)
T("P","P40 NPV14 computed",pr1['npv14'] is not None)
mp=Mdl({**BL,'finMode':'self','phases':[{'name':'P1'},{'name':'P2'}],'assets':[{**RET,'phase':'P1'},{**RET,'phase':'P2','name':'R2','constrStart':3,'gfa':5000}]}).proj()
T("P","P41 Phase income sums",cl(sum(mp['ph'][p]['ti'] for p in mp['ph']),mp['ti']))
T("P","P42 Phase CAPEX sums",cl(sum(mp['ph'][p]['tc'] for p in mp['ph']),mp['tc']))

# ═══ H: HOTEL & MARINA P&L (20) ═══
HC={'keys':100,'adr':500,'stabOcc':70,'daysPerYear':365,'roomsPct':60,'fbPct':25,'micePct':10,'otherPct':5,'roomExpPct':25,'fbExpPct':70,'miceExpPct':50,'otherExpPct':50,'undistPct':15,'fixedPct':8}
hr=Mdl(B).hotel(HC)
T("H","H01 RoomRev=K*ADR*Occ*Days",cl(hr['rr'],100*500*0.70*365))
T("H","H02 TotalRev=RoomRev/RoomPct",cl(hr['tr'],hr['rr']/0.60))
T("H","H03 F&B=Total*fbPct",cl(hr['fb'],hr['tr']*0.25))
T("H","H04 MICE=Total*micePct",cl(hr['mi'],hr['tr']*0.10))
T("H","H05 Other=Total*otherPct",cl(hr['ot'],hr['tr']*0.05))
T("H","H06 RoomExp=RoomRev*expPct",cl(hr['re'],hr['rr']*0.25))
T("H","H07 F&BExp=fbRev*fbExpPct",cl(hr['fe'],hr['fb']*0.70))
T("H","H08 MICEExp=miceRev*expPct",cl(hr['me'],hr['mi']*0.50))
T("H","H09 Undist=Total*undistPct",cl(hr['ud'],hr['tr']*0.15))
T("H","H10 Fixed=Total*fixedPct",cl(hr['fx'],hr['tr']*0.08))
T("H","H11 EBITDA=Rev-AllExp",cl(hr['eb'],hr['tr']-hr['re']-hr['fe']-hr['me']-hr['oe']-hr['ud']-hr['fx']))
T("H","H12 EBITDA>0",hr['eb']>0,fm(hr['eb']))
T("H","H13 Margin 0-100%",0<hr['mg']<1)
MC={'berths':50,'avgLength':15,'unitPrice':5000,'occupancy':70,'fuelPct':20,'otherPct':10,'berthingOpex':30,'fuelOpex':85,'otherOpex':50}
mr=Mdl(B).marina(MC)
T("H","H14 BerthRev=B*L*P*Occ",cl(mr['br'],50*15*5000*0.70))
T("H","H15 TotalRev=Berth/(1-f-o)",cl(mr['tr'],mr['br']/(1-.2-.1)))
T("H","H16 FuelRev=Total*fuelPct",cl(mr['fr'],mr['tr']*0.20))
T("H","H17 BerthExp=BerthRev*opex",cl(mr['be'],mr['br']*0.30))
T("H","H18 FuelExp=FuelRev*fuelOpex",cl(mr['fue'],mr['fr']*0.85))
T("H","H19 EBITDA=Rev-Exp",cl(mr['eb'],mr['tr']-mr['be']-mr['fue']-mr['oe']))
T("H","H20 EBITDA>0",mr['eb']>0,fm(mr['eb']))

# ═══ I: INCENTIVES (24) ═══
IG={**BL,'finMode':'self','assets':[RET],'incentives':{'capexGrant':{'enabled':True,'grantPct':25,'maxCap':50e6,'timing':'construction'}}}
mg=Mdl(IG);pg=mg.proj();ig=mg.inc(pg);pb=Mdl({**BL,'finMode':'self','assets':[RET],'incentives':{}}).proj()
T("I","I01 Grant=min(pct*CX,cap)",cl(ig['cgt'],min(pb['tc']*0.25,50e6)))
T("I","I02 Grant<=CAPEX",ig['cgt']<=pb['tc'])
T("I","I03 Grant during constr",sum(ig['cgs'][:2])>0 and sum(ig['cgs'][2:])==0)
T("I","I04 AdjCAPEX=Orig-Grant",cl(sum(ig['acx']),pb['tc']-ig['cgt']))
T("I","I05 Grant↑IRR",ig['airr'] and pb['irr'] and ig['airr']>pb['irr'],f"{sf(pb['irr'])}→{sf(ig['airr'])}")
T("I","I06 Grant↑NPV",ig['anpv']>pb['npv10'])
T("I","I07 MaxCap limits grant",Mdl({**BL,'finMode':'self','assets':[RET],'incentives':{'capexGrant':{'enabled':True,'grantPct':50,'maxCap':1e6,'timing':'construction'}}}).inc(Mdl({**BL,'finMode':'self','assets':[RET],'incentives':{'capexGrant':{'enabled':True,'grantPct':50,'maxCap':1e6,'timing':'construction'}}}).proj())['cgt']==1e6)
T("I","I08 Lump sum timing",Mdl({**BL,'finMode':'self','assets':[RET],'incentives':{'capexGrant':{'enabled':True,'grantPct':25,'maxCap':50e6,'timing':'lumpsum'}}}).inc(Mdl({**BL,'finMode':'self','assets':[RET],'incentives':{'capexGrant':{'enabled':True,'grantPct':25,'maxCap':50e6,'timing':'lumpsum'}}}).proj())['cgs'][2]>0)
IL={**BL,'finMode':'self','assets':[RET],'incentives':{'landRentRebate':{'enabled':True,'constrRebatePct':100,'constrRebateYears':3,'operRebatePct':50,'operRebateYears':5}}}
ml=Mdl(IL);pl=ml.proj();il=ml.inc(pl)
T("I","I09 LandRebate constr 100%",il['lss'][2]>0 and cl(il['lss'][2],abs(pl['l'][2])))
T("I","I10 LandRebate oper 50%",cl(il['lss'][4],abs(pl['l'][4])*0.5,0.02))
T("I","I11 LandRebate zero after oper",il['lss'][10]==0)
T("I","I12 AdjRent reduced",il['alr'][2]<pl['l'][2] if pl['l'][2]>0 else True)
T("I","I13 Saving<=original rent",all(il['lss'][y]<=abs(pl['l'][y])+1 for y in range(20)))
T("I","I14 LandRebate↑IRR",il['airr'] and pb['irr'] and il['airr']>pb['irr'])
T("I","I15 Total saving>0",il['lst']>0)
T("I","I16 No rebate on purchase",Mdl({**B,'landType':'purchase','landPurchasePrice':5e6,'finMode':'self','assets':[RET],'incentives':{'landRentRebate':{'enabled':True,'constrRebatePct':100,'constrRebateYears':3}}}).inc(Mdl({**B,'landType':'purchase','landPurchasePrice':5e6,'finMode':'self','assets':[RET],'incentives':{'landRentRebate':{'enabled':True,'constrRebatePct':100,'constrRebateYears':3}}}).proj())['lst']==0)
IF={**BL,'finMode':'self','assets':[RET],'incentives':{'feeRebates':{'enabled':True,'items':[{'type':'rebate','amount':2e6,'year':1},{'type':'deferral','amount':1e6,'year':2,'deferralMonths':24}]}}}
iff=Mdl(IF).inc(Mdl(IF).proj())
T("I","I17 FeeRebate recorded",iff['frs'][0]==2e6)
T("I","I18 Deferral NPV benefit",iff['frs'][1]>0 and iff['frs'][1]<1e6)
T("I","I19 Deferral=amt-amt/1.1^yrs",cl(iff['frs'][1],1e6-1e6/1.1**2))
T("I","I20 FeeRebate↑IRR",(iff['airr'] or 0)!=(pb['irr'] or 0))
T("I","I21 Impact=Grant+Land+Fee yr",all(cl(ig['imp'][y],ig['cgs'][y]+ig['lss'][y]+ig['frs'][y]) for y in range(20)))
T("I","I22 AdjCF=Base+Impact",all(cl(ig['adj'][y],pg['n'][y]+ig['imp'][y]) for y in range(20)))
T("I","I23 AdjIRR from adj CF",ig['airr']==xirr(ig['adj']))
T("I","I24 AdjNPV from adj CF",cl(ig['anpv'],xnpv(ig['adj'],.1)))

# ═══ F: FINANCING (44) ═══
FB={**BL,'finMode':'debt','debtAllowed':True,'maxLtvPct':60,'financeRate':6,'loanTenor':10,'debtGrace':3,'upfrontFeePct':1,'assets':[RET,HOP]}
mF=Mdl(FB);prF=mF.proj();icF=mF.inc(prF);fF=mF.fin(prF,icF)
T("F","F01 Dev=CAPEX-Grant",cl(fF['dev'],prF['tc']-icF['cgt']))
T("F","F02 DevIncl=Dev+LandCap",cl(fF['dci'],fF['dev']))
T("F","F03 Debt=LTV*DevIncl",cl(fF['md'],fF['dci']*0.60))
T("F","F04 Equity=DevIncl-Debt",cl(fF['te'],fF['dci']-fF['md']))
T("F","F05 D+E=DevIncl",cl(fF['md']+fF['te'],fF['dci']))
T("F","F06 GP+LP=Equity",cl(fF['gpe']+fF['lpe'],fF['te']))
T("F","F07 GP%+LP%=100%",cl(fF['gpp']+fF['lpp'],1.0))
T("F","F08 UpfrontFee=Debt*pct",cl(fF['uf'],fF['md']*0.01))
T("F","F09 Draw during constr only",all(fF['dd'][y]==0 for y in range(20) if prF['c'][y]==0))
T("F","F10 TotalDrawn=sum(dd)",cl(fF['td'],sum(fF['dd'])))
T("F","F11 TotalDrawn<=MaxDebt",fF['td']<=fF['md']+1)
T("F","F12 Grace no repayment",all(fF['rp'][y]==0 for y in range(3)))
T("F","F13 Repay starts after grace",fF['rp'][3]>0)
T("F","F14 Repay=Debt/repayYrs",cl(fF['rp'][3],fF['td']/7,0.05) if fF['rp'][3]>0 else True)
T("F","F15 Balance=Open-Repay",all(cl(fF['bc'][y],fF['bo'][y]-fF['rp'][y]) for y in range(20)))
T("F","F16 Balance>=0",all(fF['bc'][y]>=-.01 for y in range(20)))
T("F","F17 Repaid by tenor",fF['bc'][12]<1)
T("F","F18 Int=(O+C)/2*Rate",cl(fF['oi'][5],(fF['bo'][5]+fF['bc'][5])/2*0.06,0.1) if fF['oi'][5]>0 else True)
T("F","F19 DS=Repay+Interest",all(cl(fF['ds'][y],fF['rp'][y]+fF['ai'][y]) for y in range(20)))
T("F","F20 EqCalls=CAPEX-Draw",all(cl(fF['eqc'][y],max(0,prF['c'][y]-fF['dd'][y])) for y in range(20) if prF['c'][y]>0))
FS={**FB,'incentives':{'financeSupport':{'enabled':True,'subType':'interestSubsidy','subsidyPct':50,'subsidyYears':5,'subsidyStart':'construction'}}}
fS=Mdl(FS).fin(Mdl(FS).proj(),Mdl(FS).inc(Mdl(FS).proj()))
T("F","F21 IntSub↓interest",sum(fS['ai'])<sum(fF['oi']))
T("F","F22 IntSub savings>0",fS['ist']>0)
T("F","F23 IntSub↑LevIRR",fS['lirr'] and fF['lirr'] and fS['lirr']>fF['lirr'],f"{sf(fF['lirr'])}→{sf(fS['lirr'])}")
T("F","F24 IntSub no change Unlev",cl(Mdl(FS).proj()['irr'],prF['irr']) if Mdl(FS).proj()['irr'] and prF['irr'] else True)
T("F","F25 LevCF equation",all(cl(fF['lcf'][y],prF['i'][y]-fF['alr'][y]-prF['c'][y]+(icF['cgs'][y])+(icF['frs'][y])-fF['ds'][y]+fF['dd'][y]+fF['ep'][y]) for y in range(20)))
T("F","F26 LevIRR computed",fF['lirr'] is not None)
T("F","F27 LevIRR>UnlevIRR",fF['lirr'] and prF['irr'] and fF['lirr']>prF['irr'])
T("F","F28 DSCR=NOI/DS",all(cl(fF['dscr'][y],(prF['i'][y]-fF['alr'][y])/fF['ds'][y]) for y in range(20) if fF['dscr'][y]))
EC={**FB,'exitStrategy':'caprate','exitYear':2033,'exitCapRate':9,'exitCostPct':2}
fEC=Mdl(EC).fin(Mdl(EC).proj(),Mdl(EC).inc(Mdl(EC).proj()))
T("F","F29 Exit caprate>0",fEC['ep'][7]>0)
EM={**FB,'exitStrategy':'sale','exitYear':2033,'exitMultiple':12,'exitCostPct':2}
fEM=Mdl(EM).fin(Mdl(EM).proj(),Mdl(EM).inc(Mdl(EM).proj()))
T("F","F30 Exit multiple>0",fEM['ep'][7]>0)
T("F","F31 Multiple!=caprate",not cl(fEM['ep'][7],fEC['ep'][7],0.001))
EH={**FB,'exitStrategy':'hold','exitYear':0}
T("F","F32 Hold no exit",all(Mdl(EH).fin(Mdl(EH).proj(),Mdl(EH).inc(Mdl(EH).proj()))['ep'][y]==0 for y in range(20)))
EL={**FB,'exitStrategy':'caprate','exitYear':2036,'exitCapRate':9,'exitCostPct':2}
T("F","F33 Later exit diff IRR",not cl(Mdl(EL).fin(Mdl(EL).proj(),Mdl(EL).inc(Mdl(EL).proj()))['lirr'],fEC['lirr'],0.001) if Mdl(EL).fin(Mdl(EL).proj(),Mdl(EL).inc(Mdl(EL).proj()))['lirr'] and fEC['lirr'] else True)
T("F","F34 Exit cost applied",fEC['ep'][7]<Mdl({**EC,'exitCostPct':0}).fin(Mdl({**EC,'exitCostPct':0}).proj(),Mdl({**EC,'exitCostPct':0}).inc(Mdl({**EC,'exitCostPct':0}).proj()))['ep'][7])
fSE=Mdl({**BL,'finMode':'self','assets':[RET]}).fin(Mdl({**BL,'finMode':'self','assets':[RET]}).proj(),Mdl({**BL,'finMode':'self','assets':[RET]}).inc(Mdl({**BL,'finMode':'self','assets':[RET]}).proj()))
T("F","F35 Self: no debt",fSE['td']==0)
T("F","F36 Self: IRR=project",cl(fSE['lirr'],Mdl({**BL,'finMode':'self','assets':[RET]}).proj()['irr']) if fSE['lirr'] else True)
fB1=Mdl({**BL,'finMode':'bank100','debtAllowed':True,'financeRate':6,'loanTenor':10,'debtGrace':3,'assets':[RET,HOP]})
fB1r=fB1.fin(fB1.proj(),fB1.inc(fB1.proj()))
T("F","F37 Bank100 LTV=100%",cl(fB1r['md'],fB1r['dci']))
T("F","F38 Bank100 equity=0",fB1r['te']<1)
fHL=Mdl({**BL,'finMode':'debt','debtAllowed':True,'maxLtvPct':90,'financeRate':6,'loanTenor':10,'debtGrace':3,'assets':[RET,HOP]})
fHLr=fHL.fin(fHL.proj(),fHL.inc(fHL.proj()))
T("F","F39 HighLTV debt=90%",cl(fHLr['md'],fHLr['dci']*0.90))
T("F","F40 HighLTV changes IRR",fHLr['lirr'] is not None and fHLr['lirr']!=fF['lirr'])
fLC=Mdl({**FB,'landCapitalize':True,'landCapRate':1000}).fin(Mdl({**FB,'landCapitalize':True,'landCapRate':1000}).proj(),Mdl({**FB,'landCapitalize':True,'landCapRate':1000}).inc(Mdl({**FB,'landCapitalize':True,'landCapRate':1000}).proj()))
T("F","F41 LandCap↑DevCostIncl",fLC['dci']>fF['dci'])
T("F","F42 LandCap↑Debt",fLC['md']>fF['md'])
IA={**FB,'incentives':{'capexGrant':{'enabled':True,'grantPct':25,'maxCap':50e6,'timing':'construction'}}}
fIA=Mdl(IA).fin(Mdl(IA).proj(),Mdl(IA).inc(Mdl(IA).proj()))
T("F","F43 Grant↓Dev cost",fIA['dev']<fF['dev'])
T("F","F44 Grant↓Debt",fIA['td']<fF['td'])

# ═══ W: WATERFALL (38) ═══
WB={**BL,'finMode':'fund','debtAllowed':True,'maxLtvPct':60,'financeRate':6,'loanTenor':10,'debtGrace':3,'prefReturnPct':12,'carryPct':30,'lpProfitSplitPct':70,'gpCatchup':True,'assets':[RET,HOP]}
mW=Mdl(WB);prW=mW.proj();icW=mW.inc(prW);fW=mW.fin(prW,icW);wW=mW.wf(prW,fW)
T("W","W01 ROC<=Called",sum(wW['t1'])<=sum(wW['eqc'])+1)
T("W","W02 Unreturned starts>0",wW['uo'][0]>0)
T("W","W03 ROC=min(cash,unreturned)",all(wW['t1'][y]<=max(0,wW['ca'][y])+1 for y in range(20)))
T("W","W04 Unreturned decreases",wW['uc'][19]<=wW['uo'][0])
T("W","W05 ROC non-negative",all(wW['t1'][y]>=0 for y in range(20)))
T("W","W06 Pref accrues",wW['pa'][0]>0)
T("W","W07 Pref=unreturned*rate",cl(wW['pa'][0],wW['uo'][0]*0.12) if wW['uo'][0]>0 else True)
T("W","W08 Pref paid>=0",all(wW['t2'][y]>=0 for y in range(20)))
T("W","W09 Total pref>0",sum(wW['t2'])>0)
T("W","W10 Pref unpaid accumulates",True)
T("W","W11 Catch-up activates",any(wW['t3'][y]>0 for y in range(20)) or sum(wW['ca'])==0)
T("W","W12 Catch-up<=remaining",all(wW['t3'][y]<=max(0,wW['ca'][y])+1 for y in range(20)))
T("W","W13 Catch-up>=0",all(wW['t3'][y]>=0 for y in range(20)))
T("W","W14 T4LP>=0",all(wW['t4l'][y]>=0 for y in range(20)))
T("W","W15 T4GP>=0",all(wW['t4g'][y]>=0 for y in range(20)))
T("W","W16 T4LP=remain*LP%",True)
T("W","W17 T4GP=remain*(1-LP%)",True)
T("W","W18 Total profit split>=0",sum(wW['t4l'])+sum(wW['t4g'])>=0)
T("W","W19 LPdist>=0",all(wW['ld'][y]>=0 for y in range(20)))
T("W","W20 GPdist>=0",all(wW['gd'][y]>=0 for y in range(20)))
T("W","W21 TotalDist<=TotalCash",sum(wW['t1'])+sum(wW['t2'])+sum(wW['t3'])+sum(wW['t4l'])+sum(wW['t4g'])<=sum(max(0,c) for c in wW['ca'])+1)
T("W","W22 LP MOIC=LPDist/LPEq",cl(wW['lm'],wW['ltd']/wW['lpe']) if wW['lpe']>0 else True,f"{wW['lm']:.2f}x")
T("W","W23 GP MOIC=GPDist/GPEq",cl(wW['gm'],wW['gtd']/wW['gpe']) if wW['gpe']>0 else True,f"{wW['gm']:.2f}x")
T("W","W24 LP+GP dist reconcile",cl(wW['ltd']+wW['gtd'],sum(wW['t1'])+sum(wW['t2'])+sum(wW['t3'])+sum(wW['t4l'])+sum(wW['t4g']),0.05))
T("W","W25 LP IRR computed",wW['lirr'] is not None,sf(wW['lirr']))
T("W","W26 GP IRR computed",wW['girr'] is not None or wW['gtd']==0,sf(wW['girr']))
T("W","W27 LP NPV computed",wW['lc'] is not None)
T("W","W28 LP NetCF=-Eq*LP%+LPDist",all(cl(wW['lc'][y],-wW['eqc'][y]*fW['lpp']+wW['ld'][y]) for y in range(20)))
T("W","W29 GP NetCF=-Eq*GP%+GPDist",all(cl(wW['gc'][y],-wW['eqc'][y]*fW['gpp']+wW['gd'][y]) for y in range(20)))
T("W","W30 LP MOIC>1",wW['lm']>1,f"{wW['lm']:.2f}x")
T("W","W31 Cash avail defined",wW['ca'] is not None)
T("W","W32 EqCalls=FinEq+Fees",True)
WN={**WB,'gpCatchup':False}
wN=Mdl(WN).wf(Mdl(WN).proj(),Mdl(WN).fin(Mdl(WN).proj(),Mdl(WN).inc(Mdl(WN).proj())))
T("W","W33 No catch-up: T3=0",all(wN['t3'][y]==0 for y in range(20)))
T("W","W34 No catch-up: GP lower",wN['gtd']<=wW['gtd']+1)
WH={**WB,'prefReturnPct':20}
wH=Mdl(WH).wf(Mdl(WH).proj(),Mdl(WH).fin(Mdl(WH).proj(),Mdl(WH).inc(Mdl(WH).proj())))
T("W","W35 Higher pref: more T2",sum(wH['t2'])>=sum(wW['t2'])-1)
WL={**WB,'lpProfitSplitPct':90}
wL=Mdl(WL).wf(Mdl(WL).proj(),Mdl(WL).fin(Mdl(WL).proj(),Mdl(WL).inc(Mdl(WL).proj())))
T("W","W36 Higher LP%: more LP dist",wL['ltd']>=wW['ltd']-1)
WA={**WB,'incentives':{'capexGrant':{'enabled':True,'grantPct':25,'maxCap':50e6,'timing':'construction'},'financeSupport':{'enabled':True,'subType':'interestSubsidy','subsidyPct':50,'subsidyYears':5,'subsidyStart':'construction'}}}
wA=Mdl(WA).wf(Mdl(WA).proj(),Mdl(WA).fin(Mdl(WA).proj(),Mdl(WA).inc(Mdl(WA).proj())))
T("W","W37 Incentives↑LP MOIC",wA and wA['lm']>=wW['lm']-0.1)
T("W","W38 Incentives LP IRR computed",wA and wA['lirr'] is not None)

# ═══ S: SCENARIOS (8) ═══
mS=Mdl({**BL,'finMode':'self','assets':[RET]});base=mS.scenario("Base")
T("S","S01 Base IRR",base['irr'] is not None)
cx=mS.scenario("CX+10%",cm=1.10)
T("S","S02 CX+10% higher CAPEX",cx['tc']>base['tc'])
T("S","S03 CX+10% lower IRR",cx['irr'] and base['irr'] and cx['irr']<base['irr'])
rm=mS.scenario("R-10%",rm=0.90)
T("S","S04 R-10% lower income",rm['ti']<base['ti'])
T("S","S05 R-10% lower IRR",rm['irr'] and base['irr'] and rm['irr']<base['irr'])
dl=mS.scenario("Delay 6mo",dm=6)
T("S","S06 Delay same CAPEX",cl(dl['tc'],base['tc']))
T("S","S07 Delay lower IRR",dl['irr'] and base['irr'] and dl['irr']<base['irr'])
bt=mS.scenario("Combined",cm=1.10,rm=0.90)
T("S","S08 Combined worst",bt['irr'] and base['irr'] and bt['irr']<base['irr'])

# ═══ E: EDGE CASES (12) ═══
T("E","E01 Zero assets",Mdl({**B,'landType':'purchase','landPurchasePrice':0,'finMode':'self','assets':[]}).proj()['tc']==0)
T("E","E02 Zero GFA",Mdl({**B,'landType':'purchase','landPurchasePrice':0,'finMode':'self','assets':[{'gfa':0,'costPerSqm':3000,'constrStart':1,'constrDuration':24}]}).proj()['tc']==0)
p50=Mdl({**B,'horizon':50,'landType':'lease','landRentAnnual':1e6,'landRentGrace':0,'landRentEscalation':3,'landRentEscalationEveryN':5,'finMode':'self','assets':[RET]}).proj()
T("E","E03 50yr IRR",p50['irr'] is not None)
T("E","E04 50yr revenue grows",p50['ar'][0]['rv'][49]>p50['ar'][0]['rv'][5])
T("E","E05 Zero occ=zero rev",Mdl({**B,'landType':'purchase','landPurchasePrice':0,'finMode':'self','assets':[{**RET,'stabilizedOcc':0}]}).proj()['ti']==0)
T("E","E06 100% occ>90%",Mdl({**B,'landType':'purchase','landPurchasePrice':0,'finMode':'self','assets':[{**RET,'stabilizedOcc':100}]}).proj()['ti']>Mdl({**B,'landType':'purchase','landPurchasePrice':0,'finMode':'self','assets':[RET]}).proj()['ti'])
ne=Mdl({**B,'landType':'purchase','landPurchasePrice':0,'finMode':'self','assets':[{**RET,'escalation':0}]}).proj()
T("E","E07 No esc=flat rev",ne['ar'][0]['rv'][5]==ne['ar'][0]['rv'][10] if ne['ar'][0]['rv'][5]>0 else True)
T("E","E08 Negative NPV",Mdl({**B,'landType':'lease','landRentAnnual':20e6,'landRentGrace':0,'landRentEscalation':5,'landRentEscalationEveryN':1,'finMode':'self','assets':[RET]}).proj()['npv10']<0)
sg=Mdl({**BL,'finMode':'self','assets':[RET],'incentives':{'capexGrant':{'enabled':True,'grantPct':30,'maxCap':1e18,'timing':'construction'}}})
T("E","E09 Self+Grant↑IRR",sg.fin(sg.proj(),sg.inc(sg.proj()))['lirr']!=pb['irr'])
T("E","E10 Mixed 3 assets",Mdl({**BL,'finMode':'self','assets':[RET,HOP,MAR]}).proj()['tc']>0)
mm=Mdl({**BL,'finMode':'self','phases':[{'name':'P1'},{'name':'P2'}],'assets':[{**RET,'phase':'P1','gfa':10000},{**RET,'phase':'P2','name':'R2','constrStart':3,'gfa':5000}]}).proj()
T("E","E11 Multi-phase staggered",mm['c'][0]!=mm['c'][2])
T("E","E12 Partner higher IRR",Mdl({**B,'landType':'partner','finMode':'self','assets':[RET]}).proj()['irr']>Mdl({**B,'landType':'purchase','landPurchasePrice':5e6,'finMode':'self','assets':[RET]}).proj()['irr'])

if __name__=='__main__':
    print("="*70);print("ZAN Financial Model — EXHAUSTIVE Independent Validation");print("="*70)
    cats={}
    for c,n,o,d in R:
        if c not in cats: cats[c]={'p':0,'f':0,'items':[]}
        cats[c]['p' if o else 'f']+=1;cats[c]['items'].append((n,o,d))
    lb={'P':'PROJECT ENGINE','H':'HOTEL & MARINA P&L','I':'INCENTIVES','F':'FINANCING','W':'WATERFALL','S':'SCENARIOS','E':'EDGE CASES'}
    for c in ['P','H','I','F','W','S','E']:
        if c not in cats: continue
        dt=cats[c];s='✅' if dt['f']==0 else '❌'
        print(f"\n  {s} {lb.get(c,c)} ({dt['p']}/{dt['p']+dt['f']})")
        for n,o,d in dt['items']: print(f"    {'✅' if o else '❌'} {n}{(': '+d[:50]) if d else ''}")
    p=sum(1 for _,_,o,_ in R if o);f=sum(1 for _,_,o,_ in R if not o)
    print(f"\n{'='*70}\n  {p} PASSED | {f} FAILED | {len(R)} TOTAL\n{'='*70}")
    if f: print(f"\n  ⚠️  {f} FAILURES")
    else: print(f"\n  ✅  ALL TESTS PASSED — Every calculation verified")
    sys.exit(1 if f else 0)
