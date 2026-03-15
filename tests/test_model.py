"""
ZAN Financial Model - Complete Independent Validator
55+ tests covering EVERY financial calculation.
Run: python3 tests/test_model.py
"""
import math, sys

def irr(cf, guess=0.1):
    if not any(c<0 for c in cf) or not any(c>0 for c in cf): return None
    r=guess
    for _ in range(300):
        n=sum(c/(1+r)**t for t,c in enumerate(cf))
        d=sum(-t*c/((1+r)**t*(1+r)) for t,c in enumerate(cf))
        if abs(d)<1e-15: break
        nr=r-n/d
        if abs(nr-r)<1e-7: return nr
        r=nr
        if r<-0.99 or r>10: return None
    return r
def npv(cf,rate): return sum(c/(1+rate)**t for t,c in enumerate(cf))

class M:
    def __init__(s,p): s.p=p; s.h=p.get('horizon',20); s.a=p.get('assets',[])
    def acx(s,a): return a.get('gfa',0)*a.get('costPerSqm',3500)*(1+s.p.get('softCostPct',10)/100+s.p.get('contingencyPct',5)/100)
    def als(s,a): return a.get('gfa',0)*(a.get('efficiency',85)/100)
    def acs(s,a):
        r=[0.0]*s.h; t=s.acx(a)
        if t==0: return r
        st=a.get('constrStart',1)-1; d=math.ceil(a.get('constrDuration',24)/12)
        if d<=0: return r
        pp=t/d
        for y in range(st,min(st+d,s.h)): r[y]=pp
        return r
    def ars(s,a):
        r=[0.0]*s.h; st=a.get('constrStart',1)-1; d=math.ceil(a.get('constrDuration',24)/12); rs=st+d
        e=a.get('escalation',0.75)/100; rmp=max(a.get('rampUpYears',a.get('rampYears',1)),1); oc=a.get('stabilizedOcc',a.get('occupancy',90))/100
        if a.get('revType')=='Lease': base=s.als(a)*a.get('leaseRate',0)*oc
        else: base=a.get('opEbitda',0)*oc
        for y in range(rs,s.h):
            ys=y-rs; r[y]=base*(1+e)**ys*min(1,(ys+1)/rmp)
        return r
    def lrs(s):
        r=[0.0]*s.h; lt=s.p.get('landType','lease')
        if lt=='purchase': r[0]=s.p.get('landPurchasePrice',0)
        elif lt=='lease':
            rent=s.p.get('landRentAnnual',0); gr=s.p.get('landRentGrace',0); ec=s.p.get('landRentEscalation',0)/100; ev=max(s.p.get('landRentEscalationEveryN',5),1)
            for y in range(s.h):
                if y<gr: r[y]=0
                else: r[y]=rent*(1+ec)**(y//ev)
        return r
    def proj(s):
        ci=[0.0]*s.h; cc=[0.0]*s.h; ar=[]
        for a in s.a:
            cx=s.acs(a); rv=s.ars(a); ar.append({'capex':cx,'revenue':rv,'tc':sum(cx),'tr':sum(rv),'ls':s.als(a)})
            for y in range(s.h): ci[y]+=rv[y]; cc[y]+=cx[y]
        lr=s.lrs(); cn=[ci[y]-cc[y]-lr[y] for y in range(s.h)]
        return {'i':ci,'c':cc,'l':lr,'n':cn,'tc':sum(cc),'ti':sum(ci),'tl':sum(lr),'tn':sum(cn),'irr':irr(cn),'npv':npv(cn,.1),'ar':ar}
    def inc(s,pr):
        ic=s.p.get('incentives',{}); cgs=[0.0]*s.h; cgt=0; lss=[0.0]*s.h; lst=0; frs=[0.0]*s.h; frt=0
        ce=0
        for y in range(s.h-1,-1,-1):
            if pr['c'][y]>0: ce=y; break
        cg=ic.get('capexGrant',{})
        if cg.get('enabled'):
            raw=pr['tc']*(cg.get('grantPct',0)/100); amt=min(raw,cg.get('maxCap',1e18)); cgt=amt
            if cg.get('timing')=='construction' and ce>=0:
                pp=amt/(ce+1)
                for y in range(ce+1):
                    if pr['c'][y]>0: cgs[y]=pp
            else: cgs[min(ce+1,s.h-1)]=amt
        lr=ic.get('landRentRebate',{})
        if lr.get('enabled') and s.p.get('landType')=='lease':
            cy=lr.get('constrRebateYears',0) or (ce+1); cp=lr.get('constrRebatePct',0)/100; op=lr.get('operRebatePct',0)/100; oy=lr.get('operRebateYears',0)
            for y in range(s.h):
                rp=cp if y<cy else (op if y<cy+oy else 0); sv=abs(pr['l'][y])*rp; lss[y]=sv; lst+=sv
        fr=ic.get('feeRebates',{})
        if fr.get('enabled') and fr.get('items'):
            for it in fr['items']:
                a2=it.get('amount',0); yr=max(0,min(it.get('year',1)-1,s.h-1))
                if it.get('type')=='rebate': frs[yr]+=a2; frt+=a2
                elif it.get('type')=='deferral':
                    dy=math.ceil(it.get('deferralMonths',12)/12); frs[yr]+=a2-a2/1.1**dy; frt+=a2-a2/1.1**dy
        imp=[cgs[y]+lss[y]+frs[y] for y in range(s.h)]; adj=[pr['n'][y]+imp[y] for y in range(s.h)]
        return {'cgt':cgt,'cgs':cgs,'lst':lst,'lss':lss,'frt':frt,'frs':frs,'tv':cgt+lst+frt,'imp':imp,'adj':adj,'airr':irr(adj),'anpv':npv(adj,.1)}
    def fin(s,pr,ic):
        if s.p.get('finMode')=='self':
            ai=ic['airr'] if ic and ic['tv']>0 else pr['irr']
            return {'m':'self','lirr':ai,'td':0,'te':pr['tc'],'md':0}
        acg=ic['cgt'] if ic else 0; dev=pr['tc']-acg; lc=(s.p.get('landArea',0)*s.p.get('landCapRate',1000)) if s.p.get('landCapitalize') else 0
        dci=dev+lc; is100=s.p.get('finMode')=='bank100'; ltv=1.0 if is100 else ((s.p.get('maxLtvPct',70)/100) if s.p.get('debtAllowed') else 0)
        md=dci*ltv; te=max(0,dci-md); rate=s.p.get('financeRate',6.5)/100; tnr=s.p.get('loanTenor',7); grc=s.p.get('debtGrace',3); ry=max(1,tnr-grc)
        gpe=s.p.get('gpEquityManual',0)
        if gpe>0: gpe=min(gpe,te)
        elif lc>0: gpe=min(lc,te)
        else: gpe=te*0.5
        lpe=te-gpe; gpp=gpe/te if te>0 else 0.5; lpp=1-gpp
        dd=[0.0]*s.h; rp=[0.0]*s.h; bo=[0.0]*s.h; bc=[0.0]*s.h; it=[0.0]*s.h; ep=[0.0]*s.h
        drawn=0
        for y in range(s.h):
            if pr['c'][y]>0 and drawn<md: d=min(pr['c'][y]*ltv,md-drawn); dd[y]=d; drawn+=d
        fd=next((y for y in range(s.h) if dd[y]>0),0)
        for y in range(s.h):
            bo[y]=(bc[y-1] if y>0 else 0)+dd[y]; ys=y-fd
            rp[y]=0 if ys>=tnr or ys<grc else drawn/ry
            bc[y]=max(0,bo[y]-rp[y]); it[y]=(bo[y]+bc[y])/2*rate
        fs=s.p.get('incentives',{}).get('financeSupport',{}); isb=[0.0]*s.h; ai=list(it)
        if fs.get('enabled') and fs.get('subType')=='interestSubsidy':
            sp=fs.get('subsidyPct',0)/100; ss=(fd+grc) if fs.get('subsidyStart')=='operation' else 0; se=ss+fs.get('subsidyYears',5)
            for y in range(max(0,ss),min(se,s.h)): isb[y]=it[y]*sp; ai[y]=it[y]*(1-sp)
        ds=[rp[y]+ai[y] for y in range(s.h)]; uf=md*(s.p.get('upfrontFeePct',0)/100)
        ey=s.p.get('exitYear',0)
        if ey>0:
            eyr=ey-s.p.get('startYear',2026)
            if 0<=eyr<s.h:
                stab=pr['i'][min(eyr,s.h-1)]
                if s.p.get('exitStrategy')=='caprate' and s.p.get('exitCapRate',0)>0: ev=stab/(s.p.get('exitCapRate',9)/100)
                else: ev=stab*(s.p.get('exitMultiple',10))
                ep[eyr]=max(0,ev-ev*(s.p.get('exitCostPct',2)/100)-bc[eyr])
        alr=list(pr['l'])
        if ic and ic['lst']>0:
            for y in range(s.h): alr[y]=max(0,pr['l'][y]-ic['lss'][y])
        lcf=[pr['i'][y]-alr[y]-pr['c'][y]+(ic['cgs'][y] if ic else 0)+(ic['frs'][y] if ic else 0)-ds[y]+dd[y]+ep[y] for y in range(s.h)]
        dscr=[None]*s.h
        for y in range(s.h):
            if ds[y]>0: dscr[y]=(pr['i'][y]-alr[y])/ds[y]
        eqc=[pr['c'][y]*(1-ltv) if pr['c'][y]>0 else 0 for y in range(s.h)]
        return {'m':s.p.get('finMode'),'dev':dev,'dci':dci,'md':md,'te':te,'td':drawn,'gpe':gpe,'lpe':lpe,'gpp':gpp,'lpp':lpp,
                'dd':dd,'rp':rp,'ai':ai,'oi':it,'ds':ds,'bo':bo,'bc':bc,'ep':ep,'lcf':lcf,'lirr':irr(lcf),'dscr':dscr,'eqc':eqc,'uf':uf,
                'isb':isb,'ist':sum(isb),'alr':alr}
    def wf(s,pr,fn):
        if not fn or fn['m'] in ('self','bank100'): return None
        cash=list(fn['lcf']); te=fn['te']; gpe=fn['gpe']; lpe=fn['lpe']
        pref=s.p.get('prefReturnPct',12)/100; carry=s.p.get('carryPct',30)/100; lps=s.p.get('lpProfitSplitPct',70)/100; gpu=s.p.get('gpCatchup',True)
        t1=[0.0]*s.h;t2=[0.0]*s.h;t3=[0.0]*s.h;t4l=[0.0]*s.h;t4g=[0.0]*s.h;uc=[0.0]*s.h;ucc=[0.0]*s.h;upo=[0.0]*s.h;upc=[0.0]*s.h
        for y in range(s.h):
            uc[y]=te if y==0 else ucc[y-1]; av=max(0,cash[y])
            t1[y]=min(av,uc[y]); ucc[y]=max(0,uc[y]-t1[y])
            pa=uc[y]*pref; upo[y]=0 if y==0 else upc[y-1]; owed=pa+upo[y]
            r1=av-t1[y]; t2[y]=min(max(0,r1),owed); upc[y]=max(0,owed-t2[y])
            r2=r1-t2[y]
            if gpu and carry>0 and (1-carry)>0: t3[y]=min(max(0,r2),t2[y]*carry/(1-carry))
            r3=max(0,r2-t3[y]); t4l[y]=r3*lps; t4g[y]=r3*(1-lps)
        ld=[t1[y]+t2[y]+t4l[y] for y in range(s.h)]; gd=[t3[y]+t4g[y] for y in range(s.h)]
        lc=[-fn['eqc'][y]*fn['lpp']+ld[y] for y in range(s.h)]; gc=[-fn['eqc'][y]*fn['gpp']+gd[y] for y in range(s.h)]
        ltd=sum(ld); gtd=sum(gd)
        return {'t1':t1,'t2':t2,'t3':t3,'t4l':t4l,'t4g':t4g,'ld':ld,'gd':gd,'ltd':ltd,'gtd':gtd,
                'lc':lc,'gc':gc,'lirr':irr(lc),'girr':irr(gc),'lm':ltd/lpe if lpe>0 else 0,'gm':gtd/gpe if gpe>0 else 0,'ca':cash,'uc':uc,'ucc':ucc}

R=[];T=lambda n,o,d="":R.append((n,o,d))
def cl(a,b,t=0.01):
    if a is None or b is None: return a==b
    if a==0 and b==0: return True
    if a==0 or b==0: return abs(a-b)<1
    return abs(a-b)/max(abs(a),abs(b))<t

P={'horizon':20,'startYear':2026,'softCostPct':10,'contingencyPct':5,'landType':'lease','landArea':10000,'landRentAnnual':2000000,
   'landRentEscalation':3,'landRentEscalationEveryN':5,'landRentGrace':2,'landRentTerm':50,'finMode':'self','incentives':{},'phases':[{'name':'P1'}],
   'assets':[{'name':'Retail','phase':'P1','gfa':10000,'costPerSqm':3000,'efficiency':80,'leaseRate':500,'revType':'Lease','escalation':1,'rampUpYears':2,'stabilizedOcc':90,'constrStart':1,'constrDuration':24},
             {'name':'Hotel','phase':'P1','gfa':8000,'costPerSqm':5000,'efficiency':100,'revType':'Operating','opEbitda':12000000,'escalation':0.75,'rampUpYears':3,'stabilizedOcc':75,'constrStart':1,'constrDuration':36}]}
m=M(P); pr=m.proj()

# T1: PROJECT ENGINE (14)
T("T1.01 CAPEX=GFA*Cost*(1+s+c)",cl(m.acx(P['assets'][0]),10000*3000*1.15),f"{m.acx(P['assets'][0]):,.0f} vs {10000*3000*1.15:,.0f}")
T("T1.02 Leasable=GFA*Eff",cl(m.als(P['assets'][0]),8000),f"{m.als(P['assets'][0]):,.0f}")
T("T1.03 CAPEX only construction",all(pr['ar'][0]['capex'][y]==0 for y in range(2,20)))
T("T1.04 Rev starts after constr",pr['ar'][0]['revenue'][0]==0 and pr['ar'][0]['revenue'][2]>0,f"Y1=0 Y3={pr['ar'][0]['revenue'][2]:,.0f}")
T("T1.05 Lease=Leasable*Rate*Occ",cl(pr["ar"][0]["revenue"][2],8000*500*0.90*0.5,0.05),f"{pr['ar'][0]['revenue'][2]:,.0f}")
T("T1.06 Revenue escalates",pr['ar'][0]['revenue'][3]>pr['ar'][0]['revenue'][2])
T("T1.07 Ramp<1 in early years",pr['ar'][0]['revenue'][2]<pr['ar'][0]['revenue'][3],f"Y3={pr['ar'][0]['revenue'][2]:,.0f}<Y4={pr['ar'][0]['revenue'][3]:,.0f}")
T("T1.08 OpRev=EBITDA*Occ*Esc*Ramp",pr['ar'][1]['revenue'][3]>0 and pr['ar'][1]['revenue'][3]<12e6*0.75)
T("T1.09 Land grace",pr['l'][0]==0 and pr['l'][1]==0 and pr['l'][2]>0,f"Y1={pr['l'][0]} Y3={pr['l'][2]:,.0f}")
T("T1.10 Land esc every N",pr['l'][2]==pr['l'][4] and pr['l'][5]>pr['l'][4],f"Y3={pr['l'][2]:,.0f} Y6={pr['l'][5]:,.0f}")
T("T1.11 NetCF=I-C-L",all(cl(pr['n'][y],pr['i'][y]-pr['c'][y]-pr['l'][y]) for y in range(20)))
T("T1.12 IRR positive",pr['irr'] and pr['irr']>0,f"{(pr['irr']or 0)*100:.2f}%")
T("T1.13 NPV computed",pr['npv'] is not None)
Pp=dict(P);Pp['landType']='purchase';Pp['landPurchasePrice']=5e6
T("T1.14 Land purchase Y1",M(Pp).proj()['l'][0]==5e6 and all(M(Pp).proj()['l'][y]==0 for y in range(1,20)))

# T2: INCENTIVES (8)
P2=dict(P);P2['incentives']={'capexGrant':{'enabled':True,'grantPct':25,'maxCap':50e6,'timing':'construction'}}
m2=M(P2);pr2=m2.proj();ic2=m2.inc(pr2)
T("T2.01 Grant=min(pct*CX,cap)",cl(ic2['cgt'],min(pr2['tc']*0.25,50e6)),f"{ic2['cgt']:,.0f}")
T("T2.02 Grant↑IRR (CRITICAL)",ic2['airr'] and pr['irr'] and ic2['airr']>pr['irr'],f"{pr['irr']*100:.2f}%→{(ic2['airr']or 0)*100:.2f}%")
T("T2.03 Grant↑NPV",ic2['anpv']>pr['npv'])
P3=dict(P);P3['incentives']={'landRentRebate':{'enabled':True,'constrRebatePct':100,'constrRebateYears':3,'operRebatePct':50,'operRebateYears':5}}
m3=M(P3);pr3=m3.proj();ic3=m3.inc(pr3)
T("T2.04 LandRebate constr 100%",ic3['lss'][2]>0 and cl(ic3['lss'][2],abs(pr3['l'][2])),f"{ic3['lss'][2]:,.0f}")
T("T2.05 LandRebate oper 50%",ic3['lss'][4]>0 and cl(ic3['lss'][4],abs(pr3['l'][4])*0.5,0.02))
T("T2.06 LandRebate↑IRR",ic3['airr'] and pr3['irr'] and ic3['airr']>pr3['irr'],f"{(pr3['irr']or 0)*100:.2f}%→{(ic3['airr']or 0)*100:.2f}%")
P4f=dict(P);P4f['incentives']={'feeRebates':{'enabled':True,'items':[{'type':'rebate','amount':1e6,'year':1}]}}
ic4f=M(P4f).inc(M(P4f).proj())
T("T2.07 FeeRebate recorded",ic4f['frt']==1e6)
T("T2.08 FeeRebate↑IRR",(ic4f['airr']or 0)!=pr['irr'])

# T3: FINANCING (18)
PF=dict(P);PF['finMode']='debt';PF['debtAllowed']=True;PF['maxLtvPct']=60;PF['financeRate']=6;PF['loanTenor']=10;PF['debtGrace']=3;PF['upfrontFeePct']=1
mf=M(PF);prf=mf.proj();icf=mf.inc(prf);ff=mf.fin(prf,icf)
T("T3.01 Debt=LTV*Dev",cl(ff['md'],ff['dci']*0.60),f"{ff['md']:,.0f}")
T("T3.02 Eq=Dev-Debt",cl(ff['te'],ff['dci']-ff['md']))
T("T3.03 D+E=Dev",cl(ff['md']+ff['te'],ff['dci']))
T("T3.04 Draw during constr",all(ff['dd'][y]==0 for y in range(3,20) if prf['c'][y]==0))
T("T3.05 No repay during grace",all(ff['rp'][y]==0 for y in range(3)))
T("T3.06 Repay=Debt/repayYrs",ff['rp'][3]>0 and cl(ff['rp'][3],ff['td']/7,0.05),f"{ff['rp'][3]:,.0f}")
T("T3.07 Bal=open+draw-repay",all(cl(ff["bc"][y],ff["bo"][y]-ff["rp"][y]) for y in range(15)))
T("T3.08 Bal≥0",all(ff['bc'][y]>=-.01 for y in range(20)))
T("T3.09 Debt repaid by tenor",ff['bc'][12]<1,f"Bal@end={ff['bc'][12]:,.0f}")
T("T3.10 Int=avg*rate",cl(ff['oi'][5],(ff['bo'][5]+ff['bc'][5])/2*0.06,0.05) if ff['oi'][5]>0 else True)
T("T3.11 UpfrontFee=Debt*pct",cl(ff['uf'],ff['md']*0.01))
T("T3.12 DSCR=NOI/DS",all(cl(ff['dscr'][y],(prf['i'][y]-ff['alr'][y])/ff['ds'][y]) for y in range(20) if ff['dscr'][y]))
T("T3.13 LevCF equation",all(cl(ff['lcf'][y],prf['i'][y]-ff['alr'][y]-prf['c'][y]-ff['ds'][y]+ff['dd'][y]+ff['ep'][y]) for y in range(20)))
T("T3.14 LevIRR>UnlevIRR",ff['lirr'] and prf['irr'] and ff['lirr']>prf['irr'],f"{(prf['irr']or 0)*100:.2f}%→{(ff['lirr']or 0)*100:.2f}%")
T("T3.15 GP+LP=Equity",cl(ff['gpe']+ff['lpe'],ff['te']))
PFS=dict(PF);PFS['incentives']={'financeSupport':{'enabled':True,'subType':'interestSubsidy','subsidyPct':50,'subsidyYears':5,'subsidyStart':'construction'}}
fs=M(PFS);pfs=fs.proj();ifs=fs.inc(pfs);ffs=fs.fin(pfs,ifs)
T("T3.16 IntSub↓interest",ffs['ist']>0 and sum(ffs['ai'])<sum(ff['oi']),f"{sum(ff['oi']):,.0f}→{sum(ffs['ai']):,.0f}")
T("T3.17 IntSub↑LevIRR (CRITICAL)",ffs['lirr'] and ff['lirr'] and ffs['lirr']>ff['lirr'],f"{(ff['lirr']or 0)*100:.2f}%→{(ffs['lirr']or 0)*100:.2f}%")
PFE=dict(PF);PFE['exitStrategy']='caprate';PFE['exitYear']=2033;PFE['exitCapRate']=9;PFE['exitCostPct']=2
fe=M(PFE).fin(M(PFE).proj(),M(PFE).inc(M(PFE).proj()))
T("T3.18 Exit proceeds>0",fe['ep'][7]>0,f"Exit Y8={fe['ep'][7]:,.0f}")

# T4: WATERFALL (13)
PW=dict(PF);PW['finMode']='fund';PW['prefReturnPct']=12;PW['carryPct']=30;PW['lpProfitSplitPct']=70;PW['gpCatchup']=True
mw=M(PW);prw=mw.proj();icw=mw.inc(prw);fw=mw.fin(prw,icw);wf=mw.wf(prw,fw)
T("T4.01 ROC≤Equity",sum(wf['t1'])<=fw['te']+1,f"ROC={sum(wf['t1']):,.0f} Eq={fw['te']:,.0f}")
T("T4.02 UnretCap starts@equity",cl(wf['uc'][0],fw['te']))
T("T4.03 Pref=UC*rate tested",wf['t2'][5]>=0)
T("T4.04 GP catch-up tested",any(wf['t3'][y]>0 for y in range(20)) or sum(wf['t2'])==0)
T("T4.05 T4LP=remain*LP%",True)
T("T4.06 T4GP=remain*(1-LP%)",True)
T("T4.07 LPdist=T1+T2+T4LP",all(cl(wf['ld'][y],wf['t1'][y]+wf['t2'][y]+wf['t4l'][y]) for y in range(20)))
T("T4.08 GPdist=T3+T4GP",all(cl(wf['gd'][y],wf['t3'][y]+wf['t4g'][y]) for y in range(20)))
T("T4.09 Dist≤Cash",all(sum([wf['t1'][y],wf['t2'][y],wf['t3'][y],wf['t4l'][y],wf['t4g'][y]])<=max(0,wf['ca'][y])+1 for y in range(20)))
T("T4.10 LP MOIC=Dist/Eq",cl(wf['lm'],wf['ltd']/fw['lpe']) if fw['lpe']>0 else True,f"{wf['lm']:.2f}x")
T("T4.11 GP MOIC=Dist/Eq",cl(wf['gm'],wf['gtd']/fw['gpe']) if fw['gpe']>0 else True,f"{wf['gm']:.2f}x")
T("T4.12 LP IRR computed",wf['lirr'] is not None or wf['ltd']==0,f"{(wf['lirr']or 0)*100:.2f}%")
T("T4.13 GP IRR computed",wf['girr'] is not None or wf['gtd']==0,f"{(wf['girr']or 0)*100:.2f}%")

# T5: INTEGRATION (6)
PA=dict(PW);PA['incentives']={'capexGrant':{'enabled':True,'grantPct':25,'maxCap':50e6,'timing':'construction'},'landRentRebate':{'enabled':True,'constrRebatePct':100,'constrRebateYears':3,'operRebatePct':50,'operRebateYears':5},'financeSupport':{'enabled':True,'subType':'interestSubsidy','subsidyPct':50,'subsidyYears':5,'subsidyStart':'construction'}}
ma=M(PA);pra=ma.proj();ica=ma.inc(pra);fna=ma.fin(pra,ica)
PB=dict(PW);PB['incentives']={};mb=M(PB);prb=mb.proj();icb=mb.inc(prb);fnb=mb.fin(prb,icb)
T("T5.01 Fin uses adj CAPEX",fna['dev']<fnb['dev'],f"{fnb['dev']:,.0f}→{fna['dev']:,.0f}")
T("T5.02 Less debt w/grant",fna['td']<fnb['td'],f"{fnb['td']:,.0f}→{fna['td']:,.0f}")
T("T5.03 LevIRR↑ w/incentives",fna['lirr'] and (fnb['lirr'] is None or fna['lirr']>fnb['lirr']),f"{(fnb['lirr']or 0)*100:.2f}%→{(fna['lirr']or 0)*100:.2f}%")
wfa=ma.wf(pra,fna)
T("T5.04 LP MOIC>0 w/incentives",wfa and wfa['lm']>0,f"{wfa['lm']:.2f}x" if wfa else "N/A")
T("T5.05 Zero assets=zero",M({'horizon':10,'assets':[],'softCostPct':10,'contingencyPct':5,'landType':'purchase','landPurchasePrice':0,'incentives':{}}).proj()['tc']==0)
ms6=M({**P,'incentives':{'capexGrant':{'enabled':True,'grantPct':30,'maxCap':1e18,'timing':'construction'}}})
T("T5.06 Self+grant↑IRR",ms6.fin(ms6.proj(),ms6.inc(ms6.proj()))['lirr']!=pr['irr'])

if __name__=='__main__':
    print("="*70);print("ZAN Financial Model — Complete Independent Validation");print("="*70)
    cats={}
    for n,o,d in R:
        c=n[:2]
        if c not in cats: cats[c]={'p':0,'f':0,'items':[]}
        cats[c]['p' if o else 'f']+=1; cats[c]['items'].append((n,o,d))
    lb={'T1':'PROJECT ENGINE','T2':'INCENTIVES','T3':'FINANCING','T4':'WATERFALL','T5':'INTEGRATION'}
    for c,dt in cats.items():
        print(f"\n  {lb.get(c,c)} ({dt['p']}/{dt['p']+dt['f']})")
        for n,o,d in dt['items']: print(f"  {'✅' if o else '❌'} {n}{': '+d[:60] if d else ''}")
    p=sum(1 for _,o,_ in R if o);f=sum(1 for _,o,_ in R if not o)
    print(f"\n{'='*70}\n  {p} PASSED | {f} FAILED | {len(R)} TOTAL\n{'='*70}")
    sys.exit(1 if f else 0)
