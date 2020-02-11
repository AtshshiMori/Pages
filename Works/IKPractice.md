###### tags: `Unity`
# 【Procedural Animation】ロボットアームと触手のアニメーションのデモ
Procedural Animationの練習用としてIKのアルゴリズムを実装したロボットアームと触手のアニメーションのデモです。
ターゲットの位置に先端が来るように各関節の角度を勾配法で最適化しています。

## Procedural Animationとは
Proceduralは日本語だと手続き型です。つまり、スクリプトベースのアルゴリズムで行うという意味です。
プロシージャルモデリングは、モデリングツールで一から手作業でモデリングするのではなく、アルゴリズムを用いて自動的に生成し、プロシージャルアニメーションは物理シミュレーションなどのアルゴリズムによってアニメーションを自動生成します。

## FKとIK
FKはForward Kinematicsの略で、IKはInversed Kinematicsの略です。

今回実装したロボットアームを例に紹介します。
(↓こちらはYouTubeへのリンクになっているので動画を確認ください。)

[![ロボットアームの動画](https://img.youtube.com/vi/a5x2zb_q-as/0.jpg)](https://www.youtube.com/watch?v=a5x2zb_q-as){:target="_blank"}

このロボットアームは４つの関節から構成されています。FKはこの４つの関節のうち根元側から順番に角度を決定していき、最終的に先端のアーム部分の座標を求める方法です。

逆にIKは先端のアーム部分の座標を先に決め、そこから各関節の角度を求めていきます。IKでは各関節の角度は一意に定まりませんが、回転の軸や角度の制限を付けたり、人間の腕などの場合はそれらしい形になるよう様々な手法があるようです。

今回は最もオーソドックスな勾配法を用いた最適化手法を利用しました。

基本的にソースコードはこちらを参考にしています。
https://www.alanzucconi.com/2017/04/17/procedural-animations/

## ソースコードの説明
以下、今回実装したアルゴリズムの詳細を説明します。
実装はUnityでC#を使いました。

### FK
FKは各関節の角度から先端の座標を求めます。

この内容、画像は全てこちらのサイトから引用し、日本語に訳してまとめたものです。https://www.alanzucconi.com/2017/04/06/forward-kinematics/

例えば次のように３つの関節を持つロボットアームを考えます。ここでは簡単にするため２次元で考えます。$P_i$は各関節のポジションです。

![](https://i.imgur.com/6deym4d.png)

$P_0$を$\alpha_0$回転させた場合の$P_1$の位置は以下のように表されます。

$P_1 = P_0 + rotate(D_1,P_0,\alpha_0)$

ここで$D_1$は$P_0$から$P_1$へのベクトルです。rotateの部分は、ベクトル$D_1$を$P_0$を中心として角度$\alpha_0$だけ回転させたベクトルです。

![](https://i.imgur.com/P8t23mX.png)

また$P_1$の回転は、$\alpha_0$となります。

ここでさらに$P_1$を$\alpha_1$だけ回転させます。
![](https://i.imgur.com/d4Tyu6I.png)

すると$P_2$は以下のように表されます。

$P_2 = P_1 + rotate(D_1, P_1, \alpha_0 + \alpha_1)$

このように角度は根元側の回転を足し合わせたものとなります。
これをUnityで実装すると以下のようになります。

```
// FK : 角度を入力に取り、先端の位置と回転を返す
// (PositionRotationはPositionとRotationを持つ構造体)

public PositionRotation ForwardKinematics(List<float> angles)
{
    Vector3 prevPoint = Joints[0].transform.position;
    Quaternion rotation = Quaternion.identity;
    
    // 各関節のPositionを計算していく
    for (int i = 1; i < Joints.Count; i++)
    {
        // Quaternionを乗算して回転を累積する
        rotation *= Quaternion.AngleAxis(angles[i - 1], Joints[i - 1].Axis);
        Vector3 nextPoint = prevPoint + rotation * Joints[i].StartOffset;

        prevPoint = nextPoint;
    }
    
    // 先端のPositionとRotationを返す
    return new PositionRotation(prevPoint, rotation);
}
```

### IK
次にIKの実装です。
IKは先端がtargetの位置に来るように各関節の角度を自動で調整します。
ちょうど先ほどの動画のような動きです。

IKは一種の最適化問題と捉えられます。具体的には、「targetとアームの先端の距離(損失関数)を最小化する各関節の角度($\alpha_0$,$\alpha_1$,...)を求める」問題と捉えられます。そこで最適化でもオーソドックスな勾配法を利用します。

勾配法は一言でいうと、関数の傾きを頼りに値が小さくなる方向に進めることで最小化するアルゴリズムです。

![](https://i.imgur.com/8JROVaZ.png)

具体的なIKのアルゴリズムをまとめると以下のようになります。
- FKを使って現在の先端の位置Pを求める
- targetとPの距離(損失関数の値)を求める
- ある１つの関節に対して角度をstep分だけ増やす
- 新たな角度に対してFKを使って再度損失関数を求める
- ２つの損失関数の結果から傾きを求める
- 傾きから値が小さくなると予測される方は角度を変更する
- これを全ての関節に対して行う

以上を損失関数が十分小さくなるまで毎フレーム繰り返します。
以下がそのソースコードです。

```
// IK : 先端の位置がtargetの位置に合うように角度を調整する
void InverseKinematics(Transform target, List<float> angles)
{
    for (int i = 0; i < Joints.Count - 1; i++)
    {
        // 傾きを計算して値を更新
        float gradient = PartialGradient(target, angles, i);
        angles[i] -= LearningRate * gradient;

        // 角度を更新
        for (int j = 0; j < Joints.Count - 1; j++)
        {
            Joints[j].setAngle(angles[j]);
        }

        float error = ErrorFunction(target, angles);
        // 損失が閾値以下になったら終了
        if (error < ErrorThreshold)
        {
            return;
        }
    }
}
```

こちらが傾きを求める部分です。

```
// 傾きの計算
public float PartialGradient(Transform target, List<float> angles, int i)
{
    // 角度を保存しておく
    float angle = angles[i];

    // 傾きの計算
    float f_x = ErrorFunction(target, angles); // 現在の損失の計算
    angles[i] += SamplingDistance; // サンプル距離だけ進める
    float f_x_plus_d = ErrorFunction(target, angles); // サンプルを進めた場合の損失を計算
    float gradient = (f_x_plus_d - f_x) / SamplingDistance; // 傾きの計算

    // 角度を元に戻す
    angles[i] = angle;

    return gradient;
}
```

以上を実装するとデモ動画のようなロボットアームの動きが実現できます。

## 触手への応用
さらに関節の数（ボーンの数）を増やせば触手のような動きを付けることができます。

[![触手の動画](https://img.youtube.com/vi/aGcPfM8w-DY/0.jpg)](https://www.youtube.com/watch?v=aGcPfM8w-DY){:target="_blank"}

こちらはより触手らしい動きをさせるために、損失関数に新たに２つの指標を加えています。

1. targetと先端のPositionの距離(ロボットアームと同様)
2. targetと先端のRotationの差
3. 各関節のねじれの量

2を加えることで、targetと同じ向きになるように触手が回転する動きが加わります。

3を加えると触手が変にねじれてしまうことが減ります。

これらを加えることで触手がtargetにたどり着いたあともゆっくりとうねるような動きが実現でき、より触手らしさが表現できます。
